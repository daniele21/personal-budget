import {
  ArchiveFormatError,
  ArchiveIntegrityError,
  ArchivePassphraseRequiredError,
  migrateValidateAndNormalizeArchivePayload,
  sha256Bytes,
  verifyArchiveChecksums,
  type PreparedRestore,
} from '../../domain/archive';
import { base64ToBytes, decryptArchivePayload } from './archiveCrypto';
import { isAuraPortableArchive, parseArchiveContainer } from './archiveBinary';

export interface ReadPortableArchiveOptions {
  passphrase?: string;
  signal?: AbortSignal;
  onProgress?: (phase: 'reading' | 'decrypting' | 'validating' | 'verified') => void;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Archive operation was cancelled.', 'AbortError');
}

export async function readPortableArchive(
  file: Blob,
  options: ReadPortableArchiveOptions = {},
): Promise<PreparedRestore> {
  checkAbort(options.signal);
  options.onProgress?.('reading');
  const container = await parseArchiveContainer(file);
  checkAbort(options.signal);

  let plaintext: Uint8Array;
  if (container.header.encryption.mode === 'passphrase') {
    if (!options.passphrase) throw new ArchivePassphraseRequiredError();
    options.onProgress?.('decrypting');
    plaintext = await decryptArchivePayload(
      container.payloadBytes,
      options.passphrase,
      base64ToBytes(container.header.encryption.saltBase64),
      base64ToBytes(container.header.encryption.ivBase64),
      container.headerBytes,
    );
  } else {
    if (!('payloadSha256' in container.header)) {
      throw new ArchiveFormatError('The plaintext Aura archive checksum is missing.');
    }
    const checksum = await sha256Bytes(container.payloadBytes);
    if (checksum !== container.header.payloadSha256) throw new ArchiveIntegrityError('payload');
    plaintext = container.payloadBytes;
  }

  checkAbort(options.signal);
  options.onProgress?.('validating');
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)) as unknown;
  } catch {
    throw new ArchiveFormatError('The Aura archive payload is not valid JSON.');
  }
  const preparedPayload = migrateValidateAndNormalizeArchivePayload(parsed);
  await verifyArchiveChecksums(preparedPayload.payload);
  checkAbort(options.signal);

  const attachments = new Map(
    preparedPayload.payload.attachments.map((attachment) => [attachment.transactionId, attachment]),
  );
  options.onProgress?.('verified');
  return {
    data: preparedPayload.normalizedData,
    preferences: preparedPayload.payload.preferences,
    attachments,
    manifest: preparedPayload.payload.manifest,
    warnings: preparedPayload.warnings,
  };
}

export { isAuraPortableArchive };
