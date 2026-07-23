import { describe, expect, it } from 'vitest';
import {
  AURA_ARCHIVE_CRYPTO,
  AURA_ARCHIVE_FORMAT,
  AURA_ARCHIVE_FORMAT_VERSION,
  AURA_ARCHIVE_MEDIA_TYPE,
  ArchiveValidationError,
  UnsupportedArchiveVersionError,
  buildArchiveCounts,
  migrateAndValidateArchivePayload,
  migrateValidateAndNormalizeArchivePayload,
  validateArchiveHeader,
  validateArchivePayload,
  validatePortablePreferences,
} from '..';
import {
  LEGACY_NORMALIZABLE_APP_DATA,
  TEST_APP_DATA,
  TEST_PREFERENCES,
  buildEmptyArchivePayload,
  buildValidArchivePayload,
} from './fixtures';

describe('Aura archive validation', () => {
  it('accepts a complete V1 payload and preserves its canonical counts', async () => {
    const payload = await buildValidArchivePayload();
    const result = validateArchivePayload(payload);

    expect(result.value).toBe(payload);
    expect(result.warnings).toEqual([]);
    expect(payload.manifest.counts).toEqual(
      buildArchiveCounts(payload.data, payload.preferences, payload.attachments),
    );
  });

  it('accepts an empty but complete V1 recovery payload', async () => {
    const payload = await buildEmptyArchivePayload();
    expect(validateArchivePayload(payload).value.data.transactions).toEqual([]);
  });

  it('rejects missing required sections', async () => {
    const payload = await buildValidArchivePayload();
    const partial = { ...payload } as Record<string, unknown>;
    delete partial.preferences;

    expect(() => validateArchivePayload(partial)).toThrow(ArchiveValidationError);
  });

  it('rejects invalid amounts and duplicate IDs before normalization', async () => {
    const payload = await buildValidArchivePayload();
    payload.data.transactions[0].amount = Number.NaN;
    payload.data.transactions.push({ ...payload.data.transactions[1] });

    expect(() => validateArchivePayload(payload)).toThrow(ArchiveValidationError);
    try {
      validateArchivePayload(payload);
    } catch (error) {
      expect(error).toBeInstanceOf(ArchiveValidationError);
      expect((error as ArchiveValidationError).issues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining(['invalid_number', 'duplicate_id', 'duplicate_recurring_occurrence']),
      );
    }
  });

  it('allows valid financial data with a missing attachment only as a warning', async () => {
    const data = structuredClone(TEST_APP_DATA);
    const payload = await buildValidArchivePayload({ data, attachments: [] });
    const result = validateArchivePayload(payload);

    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'missing_attachment', severity: 'warning' }),
    ]);
  });

  it('rejects attachment records that point to unknown transactions', async () => {
    const payload = await buildValidArchivePayload();
    payload.attachments[0].transactionId = 'unknown-transaction';
    payload.manifest.checksums.attachments = {
      'unknown-transaction': payload.manifest.checksums.attachments['tx-receipt'],
    };

    expect(() => validateArchivePayload(payload)).toThrow(ArchiveValidationError);
  });

  it('rejects unsupported future schema versions before migration', async () => {
    const payload = await buildValidArchivePayload();
    (payload.manifest.schemaVersion as number) = 2;

    expect(() => migrateAndValidateArchivePayload(payload)).toThrow(UnsupportedArchiveVersionError);
  });

  it('rejects legacy fields mislabeled as schema V1 instead of silently casting them', async () => {
    const payload = await buildValidArchivePayload();
    payload.data = LEGACY_NORMALIZABLE_APP_DATA as unknown as typeof payload.data;

    expect(() => validateArchivePayload(payload)).toThrow(ArchiveValidationError);
    try {
      validateArchivePayload(payload);
    } catch (error) {
      expect((error as ArchiveValidationError).issues.map((issue) => issue.code)).toEqual(
        expect.arrayContaining(['missing_field', 'unknown_field']),
      );
    }
  });

  it('normalizes validated recurring data without duplicate IDs', async () => {
    const payload = await buildValidArchivePayload();
    const prepared = migrateValidateAndNormalizeArchivePayload(payload);
    const normalized = prepared.normalizedData;

    expect(new Set(normalized.transactions.map((transaction) => transaction.id)).size)
      .toBe(normalized.transactions.length);
    expect(normalized.transactions.filter((transaction) => (
      transaction.sourceRecurringId === 'rec-rent' && transaction.sourceMonthKey === '2026-07'
    ))).toHaveLength(1);
    expect(prepared.payload).toBe(payload);
  });

  it('validates complete portable preferences and rejects unknown fields', () => {
    expect(validatePortablePreferences(TEST_PREFERENCES).value).toEqual(TEST_PREFERENCES);
    expect(() => validatePortablePreferences({
      ...TEST_PREFERENCES,
      deviceId: 'not-portable',
    })).toThrow(ArchiveValidationError);
  });

  it('validates plaintext and encrypted V1 headers', () => {
    const base = {
      archiveFormat: AURA_ARCHIVE_FORMAT,
      formatVersion: AURA_ARCHIVE_FORMAT_VERSION,
      mediaType: AURA_ARCHIVE_MEDIA_TYPE,
      payloadByteLength: 128,
    } as const;

    expect(validateArchiveHeader({
      ...base,
      encryption: { mode: 'none' },
      payloadSha256: 'a'.repeat(64),
    }).value.encryption.mode).toBe('none');

    expect(validateArchiveHeader({
      ...base,
      encryption: {
        mode: 'passphrase',
        algorithm: AURA_ARCHIVE_CRYPTO.algorithm,
        keyLengthBits: AURA_ARCHIVE_CRYPTO.keyLengthBits,
        authenticationTagBits: AURA_ARCHIVE_CRYPTO.authenticationTagBits,
        kdf: AURA_ARCHIVE_CRYPTO.kdf,
        kdfHash: AURA_ARCHIVE_CRYPTO.kdfHash,
        kdfIterations: AURA_ARCHIVE_CRYPTO.kdfIterations,
        saltBase64: 'AAAAAAAAAAAAAAAAAAAAAA==',
        ivBase64: 'AAAAAAAAAAAAAAAA',
      },
    }).value.encryption.mode).toBe('passphrase');
  });
});
