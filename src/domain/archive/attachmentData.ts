import { AURA_ARCHIVE_LIMITS } from './archiveConstants';

const DATA_URL_PATTERN = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/;

export interface ParsedAttachmentDataUrl {
  mediaType: string;
  byteLength: number;
}

export function parseAttachmentDataUrl(dataUrl: string): ParsedAttachmentDataUrl | null {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;

  const [, mediaType, base64] = match;
  if (!mediaType || base64.length % 4 !== 0) return null;

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const byteLength = (base64.length / 4) * 3 - padding;
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) return null;

  return { mediaType, byteLength };
}

export function isAttachmentWithinV1Limit(dataUrl: string): boolean {
  const parsed = parseAttachmentDataUrl(dataUrl);
  return Boolean(parsed && parsed.byteLength <= AURA_ARCHIVE_LIMITS.maxAttachmentBytes);
}
