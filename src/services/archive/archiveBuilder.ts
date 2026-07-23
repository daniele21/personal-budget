import type { AppData } from '../../data/model';
import {
  AURA_ARCHIVE_CRYPTO,
  AURA_ARCHIVE_FORMAT,
  AURA_ARCHIVE_FORMAT_VERSION,
  AURA_ARCHIVE_LIMITS,
  AURA_ARCHIVE_MEDIA_TYPE,
  AURA_ARCHIVE_SCHEMA_VERSION,
  ArchiveBuildError,
  buildArchiveCounts,
  calculateArchiveChecksums,
  canonicalStringify,
  sha256Bytes,
  validateArchivePayload,
  verifyArchiveChecksums,
  type AuraArchiveEncryptedHeaderV1,
  type AuraArchiveManifestV1,
  type AuraArchivePayloadV1,
  type AuraArchivePlaintextHeaderV1,
  type PortableSnapshot,
} from '../../domain/archive';
import { archiveSnapshotService } from './archiveSnapshotService';
import {
  bytesToBase64,
  createEncryptionContext,
  encryptArchivePayload,
} from './archiveCrypto';
import { encodeArchiveContainer, serializeArchiveHeader } from './archiveBinary';
import { readPortableArchive } from './archiveReader';

export type ArchiveBuildPhase =
  | 'collecting'
  | 'validating'
  | 'encrypting'
  | 'self-verifying'
  | 'complete';

export interface ArchiveBuildOptions {
  passphrase?: string;
  sourceAppVersion?: string;
  sourceBuildSha?: string;
  createdAt?: Date;
  signal?: AbortSignal;
  onProgress?: (phase: ArchiveBuildPhase) => void;
}

export interface BuiltPortableArchive {
  blob: Blob;
  filename: string;
  manifest: AuraArchiveManifestV1;
  encrypted: boolean;
  byteLength: number;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Archive operation was cancelled.', 'AbortError');
}

function archiveDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function buildPortableArchiveFromSnapshot(
  snapshot: PortableSnapshot,
  options: ArchiveBuildOptions = {},
): Promise<BuiltPortableArchive> {
  checkAbort(options.signal);
  if (snapshot.warnings.some((warning) => (
    warning.code === 'missing_attachment' ||
    warning.code === 'invalid_attachment_data' ||
    warning.code === 'attachment_too_large'
  ))) {
    throw new ArchiveBuildError(
      'incomplete_snapshot',
      'Aura cannot create a complete archive until all referenced attachments are readable and within limits.',
    );
  }

  options.onProgress?.('validating');
  const createdAt = options.createdAt ?? new Date();
  const archiveId = crypto.randomUUID?.() ?? `archive-${createdAt.getTime()}`;
  const checksums = await calculateArchiveChecksums(snapshot);
  const manifest: AuraArchiveManifestV1 = {
    archiveFormat: AURA_ARCHIVE_FORMAT,
    formatVersion: AURA_ARCHIVE_FORMAT_VERSION,
    schemaVersion: AURA_ARCHIVE_SCHEMA_VERSION,
    createdAt: createdAt.toISOString(),
    sourceAppVersion: options.sourceAppVersion ?? '0.0.0',
    sourceBuildSha: options.sourceBuildSha ?? 'unknown',
    archiveId,
    counts: buildArchiveCounts(snapshot.data, snapshot.preferences, snapshot.attachments),
    checksums,
  };
  const payload: AuraArchivePayloadV1 = {
    manifest,
    data: snapshot.data,
    preferences: snapshot.preferences,
    attachments: snapshot.attachments,
  };
  validateArchivePayload(payload);
  await verifyArchiveChecksums(payload);
  const plaintext = new TextEncoder().encode(canonicalStringify(payload));
  if (plaintext.byteLength > AURA_ARCHIVE_LIMITS.maxPayloadBytes) {
    throw new ArchiveBuildError('archive_too_large', 'The complete Aura workspace exceeds the V1 archive size limit.');
  }
  checkAbort(options.signal);

  let blob: Blob;
  if (options.passphrase !== undefined) {
    options.onProgress?.('encrypting');
    const context = await createEncryptionContext(options.passphrase);
    const header: AuraArchiveEncryptedHeaderV1 = {
      archiveFormat: AURA_ARCHIVE_FORMAT,
      formatVersion: AURA_ARCHIVE_FORMAT_VERSION,
      mediaType: AURA_ARCHIVE_MEDIA_TYPE,
      payloadByteLength: plaintext.byteLength + AURA_ARCHIVE_CRYPTO.authenticationTagBits / 8,
      encryption: {
        mode: 'passphrase',
        algorithm: AURA_ARCHIVE_CRYPTO.algorithm,
        keyLengthBits: AURA_ARCHIVE_CRYPTO.keyLengthBits,
        authenticationTagBits: AURA_ARCHIVE_CRYPTO.authenticationTagBits,
        kdf: AURA_ARCHIVE_CRYPTO.kdf,
        kdfHash: AURA_ARCHIVE_CRYPTO.kdfHash,
        kdfIterations: AURA_ARCHIVE_CRYPTO.kdfIterations,
        saltBase64: bytesToBase64(context.salt),
        ivBase64: bytesToBase64(context.iv),
      },
    };
    const headerBytes = serializeArchiveHeader(header);
    const ciphertext = await encryptArchivePayload(plaintext, context, headerBytes);
    blob = encodeArchiveContainer(headerBytes, ciphertext);
  } else {
    const header: AuraArchivePlaintextHeaderV1 = {
      archiveFormat: AURA_ARCHIVE_FORMAT,
      formatVersion: AURA_ARCHIVE_FORMAT_VERSION,
      mediaType: AURA_ARCHIVE_MEDIA_TYPE,
      payloadByteLength: plaintext.byteLength,
      encryption: { mode: 'none' },
      payloadSha256: await sha256Bytes(plaintext),
    };
    blob = encodeArchiveContainer(serializeArchiveHeader(header), plaintext);
  }

  checkAbort(options.signal);
  options.onProgress?.('self-verifying');
  const verified = await readPortableArchive(blob, {
    passphrase: options.passphrase,
    signal: options.signal,
  });
  if (verified.manifest.archiveId !== manifest.archiveId) {
    throw new ArchiveBuildError('self_verification_failed', 'Aura could not verify the generated archive.');
  }
  options.onProgress?.('complete');
  return {
    blob,
    filename: `aura-backup-${archiveDate(createdAt)}.aura`,
    manifest,
    encrypted: options.passphrase !== undefined,
    byteLength: blob.size,
  };
}

export async function buildPortableArchive(
  data: AppData,
  options: ArchiveBuildOptions = {},
): Promise<BuiltPortableArchive> {
  options.onProgress?.('collecting');
  const snapshot = await archiveSnapshotService.collect(data);
  return buildPortableArchiveFromSnapshot(snapshot, options);
}
