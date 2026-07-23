import {
  AURA_ARCHIVE_LIMITS,
  AURA_ARCHIVE_MAGIC_BYTES,
  AURA_ARCHIVE_MEDIA_TYPE,
  ArchiveFormatError,
  canonicalStringify,
  validateArchiveHeader,
  type AuraArchiveHeaderV1,
} from '../../domain/archive';

const FIXED_PREFIX_BYTES = AURA_ARCHIVE_MAGIC_BYTES.byteLength + 4;

export interface ParsedArchiveContainer {
  header: AuraArchiveHeaderV1;
  headerBytes: Uint8Array;
  payloadBytes: Uint8Array;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((value, index) => value === right[index]);
}

export function serializeArchiveHeader(header: AuraArchiveHeaderV1): Uint8Array {
  const bytes = new TextEncoder().encode(canonicalStringify(header));
  if (bytes.byteLength > AURA_ARCHIVE_LIMITS.maxHeaderBytes) {
    throw new ArchiveFormatError('The Aura archive header exceeds the supported size.');
  }
  return bytes;
}

export function encodeArchiveContainer(headerBytes: Uint8Array, payloadBytes: Uint8Array): Blob {
  const totalBytes = FIXED_PREFIX_BYTES + headerBytes.byteLength + payloadBytes.byteLength;
  if (totalBytes > AURA_ARCHIVE_LIMITS.maxArchiveBytes) {
    throw new ArchiveFormatError('The Aura archive exceeds the supported size.');
  }
  const output = new Uint8Array(totalBytes);
  output.set(AURA_ARCHIVE_MAGIC_BYTES, 0);
  new DataView(output.buffer).setUint32(AURA_ARCHIVE_MAGIC_BYTES.byteLength, headerBytes.byteLength, false);
  output.set(headerBytes, FIXED_PREFIX_BYTES);
  output.set(payloadBytes, FIXED_PREFIX_BYTES + headerBytes.byteLength);
  return new Blob([output], { type: AURA_ARCHIVE_MEDIA_TYPE });
}

export async function isAuraPortableArchive(file: Blob): Promise<boolean> {
  if (file.size < FIXED_PREFIX_BYTES || file.size > AURA_ARCHIVE_LIMITS.maxArchiveBytes) return false;
  const prefix = new Uint8Array(await file.slice(0, AURA_ARCHIVE_MAGIC_BYTES.byteLength).arrayBuffer());
  return bytesEqual(prefix, AURA_ARCHIVE_MAGIC_BYTES);
}

export async function parseArchiveContainer(file: Blob): Promise<ParsedArchiveContainer> {
  if (file.size < FIXED_PREFIX_BYTES || file.size > AURA_ARCHIVE_LIMITS.maxArchiveBytes) {
    throw new ArchiveFormatError('The selected Aura archive has an unsupported size.');
  }
  const prefix = new Uint8Array(await file.slice(0, FIXED_PREFIX_BYTES).arrayBuffer());
  if (!bytesEqual(prefix.slice(0, AURA_ARCHIVE_MAGIC_BYTES.byteLength), AURA_ARCHIVE_MAGIC_BYTES)) {
    throw new ArchiveFormatError();
  }
  const headerLength = new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength)
    .getUint32(AURA_ARCHIVE_MAGIC_BYTES.byteLength, false);
  if (headerLength < 2 || headerLength > AURA_ARCHIVE_LIMITS.maxHeaderBytes) {
    throw new ArchiveFormatError('The Aura archive header length is invalid.');
  }
  if (FIXED_PREFIX_BYTES + headerLength > file.size) {
    throw new ArchiveFormatError('The Aura archive is truncated.');
  }

  const headerBytes = new Uint8Array(await file.slice(FIXED_PREFIX_BYTES, FIXED_PREFIX_BYTES + headerLength).arrayBuffer());
  let rawHeader: unknown;
  try {
    rawHeader = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(headerBytes)) as unknown;
  } catch {
    throw new ArchiveFormatError('The Aura archive header is not valid JSON.');
  }
  const header = validateArchiveHeader(rawHeader).value;
  const expectedSize = FIXED_PREFIX_BYTES + headerLength + header.payloadByteLength;
  if (expectedSize !== file.size) {
    throw new ArchiveFormatError('The Aura archive payload length does not match the file.');
  }
  const payloadBytes = new Uint8Array(await file.slice(FIXED_PREFIX_BYTES + headerLength).arrayBuffer());
  return { header, headerBytes, payloadBytes };
}
