import { describe, expect, it } from 'vitest';
import { normalizeAppData } from '../../../data/model';
import {
  ArchiveBuildError,
  ArchiveDecryptionError,
  ArchiveFormatError,
  type PortableSnapshot,
} from '../../../domain/archive';
import {
  TEST_APP_DATA,
  TEST_ATTACHMENT,
  TEST_PREFERENCES,
  buildLargeAppData,
} from '../../../domain/archive/__tests__/fixtures';
import { buildPortableArchiveFromSnapshot } from '../archiveBuilder';
import { isAuraPortableArchive, readPortableArchive } from '../archiveReader';
import { parseArchiveContainer } from '../archiveBinary';

function snapshot(): PortableSnapshot {
  return {
    data: structuredClone(TEST_APP_DATA),
    preferences: structuredClone(TEST_PREFERENCES),
    attachments: [structuredClone(TEST_ATTACHMENT)],
    warnings: [],
  };
}

describe('Aura portable archive codec', () => {
  it('builds, recognizes, and reads a self-verified plaintext archive', async () => {
    const phases: string[] = [];
    const built = await buildPortableArchiveFromSnapshot(snapshot(), {
      createdAt: new Date('2026-07-22T10:00:00.000Z'),
      sourceAppVersion: '1.0.0-test',
      sourceBuildSha: 'test-build',
      onProgress: (phase) => phases.push(phase),
    });

    expect(built.filename).toBe('aura-backup-2026-07-22.aura');
    expect(built.encrypted).toBe(false);
    await expect(isAuraPortableArchive(built.blob)).resolves.toBe(true);
    const prepared = await readPortableArchive(built.blob);
    expect(prepared.data.transactions.map((transaction) => transaction.id))
      .toEqual(expect.arrayContaining(['tx-receipt', 'tx-rent-2026-07']));
    expect(prepared.attachments.get('tx-receipt')).toEqual(TEST_ATTACHMENT);
    expect(prepared.data).toEqual(normalizeAppData(TEST_APP_DATA));
    expect(prepared.preferences).toEqual(TEST_PREFERENCES);
    expect(phases).toEqual(['validating', 'self-verifying', 'complete']);
  });

  it('round-trips an encrypted archive and rejects a wrong passphrase', async () => {
    const built = await buildPortableArchiveFromSnapshot(snapshot(), {
      passphrase: 'correct horse battery staple',
      sourceAppVersion: '1.0.0-test',
      sourceBuildSha: 'test-build',
    });

    expect(built.encrypted).toBe(true);
    await expect(readPortableArchive(built.blob, {
      passphrase: 'correct horse battery staple',
    })).resolves.toEqual(expect.objectContaining({
      manifest: expect.objectContaining({ archiveId: built.manifest.archiveId }),
    }));
    await expect(readPortableArchive(built.blob, {
      passphrase: 'incorrect passphrase value',
    })).rejects.toBeInstanceOf(ArchiveDecryptionError);
  });

  it('uses fresh salt and IV metadata for every encrypted archive', async () => {
    const first = await buildPortableArchiveFromSnapshot(snapshot(), {
      passphrase: 'correct horse battery staple',
    });
    const second = await buildPortableArchiveFromSnapshot(snapshot(), {
      passphrase: 'correct horse battery staple',
    });
    const firstHeader = (await parseArchiveContainer(first.blob)).header;
    const secondHeader = (await parseArchiveContainer(second.blob)).header;
    if (firstHeader.encryption.mode !== 'passphrase' || secondHeader.encryption.mode !== 'passphrase') {
      throw new Error('Expected encrypted archive headers.');
    }

    expect(firstHeader.encryption.saltBase64).not.toBe(secondHeader.encryption.saltBase64);
    expect(firstHeader.encryption.ivBase64).not.toBe(secondHeader.encryption.ivBase64);
  });

  it('detects tampering before returning prepared data', async () => {
    const built = await buildPortableArchiveFromSnapshot(snapshot(), {
      sourceAppVersion: '1.0.0-test',
      sourceBuildSha: 'test-build',
    });
    const bytes = new Uint8Array(await built.blob.arrayBuffer());
    bytes[bytes.length - 1] ^= 0xff;

    await expect(readPortableArchive(new Blob([bytes]))).rejects.toThrow();
  });

  it('rejects renamed or truncated non-archives using the binary signature', async () => {
    const fake = new File(['not an archive'], 'renamed.aura');
    await expect(isAuraPortableArchive(fake)).resolves.toBe(false);
    await expect(readPortableArchive(fake)).rejects.toBeInstanceOf(ArchiveFormatError);
  });

  it('blocks incomplete source snapshots and cancellation before mutation', async () => {
    const incomplete = snapshot();
    incomplete.warnings.push({
      code: 'missing_attachment',
      message: 'Missing attachment.',
      path: 'attachments.tx-receipt',
      severity: 'warning',
    });
    await expect(buildPortableArchiveFromSnapshot(incomplete)).rejects.toBeInstanceOf(ArchiveBuildError);

    const controller = new AbortController();
    controller.abort();
    await expect(buildPortableArchiveFromSnapshot(snapshot(), {
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('round-trips the large transaction fixture within the V1 file boundary', async () => {
    const largeSnapshot = snapshot();
    largeSnapshot.data = buildLargeAppData();
    largeSnapshot.data.recurring = [];
    largeSnapshot.attachments = [];
    largeSnapshot.data.transactions = largeSnapshot.data.transactions.map((transaction) => ({
      ...transaction,
      attachmentUrl: undefined,
    }));
    const built = await buildPortableArchiveFromSnapshot(largeSnapshot);
    const restored = await readPortableArchive(built.blob);

    expect(built.byteLength).toBeLessThan(64 * 1024 * 1024);
    expect(restored.data.transactions).toHaveLength(5_000);
  });
});
