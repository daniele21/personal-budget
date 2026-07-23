import { ArchiveIntegrityError } from './archiveErrors';
import type {
  AuraArchiveChecksums,
  AuraArchivePayloadV1,
} from './archiveTypes';

function canonicalize(value: unknown, seen: Set<object>): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON cannot contain non-finite numbers.');
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError('Canonical JSON cannot contain circular references.');
    seen.add(value);
    const result = value.map((item) => canonicalize(item, seen));
    seen.delete(value);
    return result;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) throw new TypeError('Canonical JSON cannot contain circular references.');
    seen.add(value);
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const item = record[key];
      if (item === undefined) continue;
      result[key] = canonicalize(item, seen);
    }
    seen.delete(value);
    return result;
  }
  throw new TypeError(`Canonical JSON cannot contain ${typeof value}.`);
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value, new Set()));
}

export async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256String(value: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(value));
}

export async function calculateArchiveChecksums(
  payload: Pick<AuraArchivePayloadV1, 'data' | 'preferences' | 'attachments'>,
): Promise<AuraArchiveChecksums> {
  const attachments: Record<string, string> = {};
  for (const attachment of [...payload.attachments].sort((a, b) => a.transactionId.localeCompare(b.transactionId))) {
    attachments[attachment.transactionId] = await sha256String(attachment.dataUrl);
  }

  return {
    dataSha256: await sha256String(canonicalStringify(payload.data)),
    preferencesSha256: await sha256String(canonicalStringify(payload.preferences)),
    attachments,
  };
}

export async function verifyArchiveChecksums(payload: AuraArchivePayloadV1): Promise<void> {
  const actual = await calculateArchiveChecksums(payload);
  const expected = payload.manifest.checksums;

  if (actual.dataSha256 !== expected.dataSha256) {
    throw new ArchiveIntegrityError('data');
  }
  if (actual.preferencesSha256 !== expected.preferencesSha256) {
    throw new ArchiveIntegrityError('preferences');
  }

  const expectedIds = Object.keys(expected.attachments).sort();
  const actualIds = Object.keys(actual.attachments).sort();
  if (canonicalStringify(actualIds) !== canonicalStringify(expectedIds)) {
    throw new ArchiveIntegrityError('attachments');
  }
  for (const transactionId of actualIds) {
    if (actual.attachments[transactionId] !== expected.attachments[transactionId]) {
      throw new ArchiveIntegrityError(`attachment:${transactionId}`);
    }
  }
}
