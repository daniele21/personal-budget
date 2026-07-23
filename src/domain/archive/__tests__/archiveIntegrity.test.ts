import { describe, expect, it } from 'vitest';
import {
  ArchiveIntegrityError,
  calculateArchiveChecksums,
  canonicalStringify,
  verifyArchiveChecksums,
} from '..';
import { buildValidArchivePayload } from './fixtures';

describe('Aura archive integrity', () => {
  it('canonicalizes object key order deterministically', () => {
    expect(canonicalStringify({ b: 2, a: { d: 4, c: 3 } }))
      .toBe(canonicalStringify({ a: { c: 3, d: 4 }, b: 2 }));
  });

  it('calculates and verifies data, preference, and attachment checksums', async () => {
    const payload = await buildValidArchivePayload();
    expect(await calculateArchiveChecksums(payload)).toEqual(payload.manifest.checksums);
    await expect(verifyArchiveChecksums(payload)).resolves.toBeUndefined();
  });

  it('detects payload modification', async () => {
    const payload = await buildValidArchivePayload();
    payload.data.transactions[0].amount += 1;

    await expect(verifyArchiveChecksums(payload)).rejects.toEqual(
      expect.objectContaining<Partial<ArchiveIntegrityError>>({
        code: 'archive_integrity_failed',
        section: 'data',
      }),
    );
  });
});
