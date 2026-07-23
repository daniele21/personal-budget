export const AURA_ARCHIVE_FORMAT = 'aura-portable-archive' as const;
export const AURA_ARCHIVE_FORMAT_VERSION = 1 as const;
export const AURA_ARCHIVE_SCHEMA_VERSION = 1 as const;
export const AURA_ARCHIVE_MEDIA_TYPE = 'application/vnd.aura.portable-archive' as const;
export const AURA_ARCHIVE_MAGIC_TEXT = 'AURAARC1' as const;
export const AURA_ARCHIVE_MAGIC_BYTES = new TextEncoder().encode(AURA_ARCHIVE_MAGIC_TEXT);

export const AURA_ARCHIVE_LIMITS = {
  maxHeaderBytes: 64 * 1024,
  maxArchiveBytes: 64 * 1024 * 1024,
  maxPayloadBytes: 64 * 1024 * 1024 - 64 * 1024 - 12,
  maxAttachmentCount: 250,
  maxAttachmentBytes: 2 * 1024 * 1024,
  targetMobileArchiveBytes: 32 * 1024 * 1024,
  targetPeakMemoryMultiplier: 3,
} as const;

export const AURA_ARCHIVE_CRYPTO = {
  algorithm: 'AES-GCM',
  keyLengthBits: 256,
  ivBytes: 12,
  authenticationTagBits: 128,
  kdf: 'PBKDF2',
  kdfHash: 'SHA-256',
  kdfIterations: 600_000,
  saltBytes: 16,
  minPassphraseLength: 10,
  maxPassphraseLength: 1_024,
} as const;

export const AURA_RESTORE_JOURNAL_KEY = 'aura_restore_journal_v1' as const;
export const AURA_RESTORE_STAGING_PREFIX = 'aura_restore/' as const;
