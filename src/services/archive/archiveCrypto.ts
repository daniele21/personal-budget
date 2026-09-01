import {
  AURA_ARCHIVE_CRYPTO,
  ArchiveBuildError,
  ArchiveDecryptionError,
} from '../../domain/archive';

export interface ArchiveEncryptionContext {
  key: CryptoKey;
  salt: Uint8Array;
  iv: Uint8Array;
}

function asBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(bytes);
}

function validatePassphrase(passphrase: string): void {
  if (
    passphrase.length < AURA_ARCHIVE_CRYPTO.minPassphraseLength ||
    passphrase.length > AURA_ARCHIVE_CRYPTO.maxPassphraseLength
  ) {
    throw new ArchiveBuildError(
      'invalid_passphrase',
      `Passphrase must contain between ${AURA_ARCHIVE_CRYPTO.minPassphraseLength} and ${AURA_ARCHIVE_CRYPTO.maxPassphraseLength} characters.`,
    );
  }
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    AURA_ARCHIVE_CRYPTO.kdf,
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: AURA_ARCHIVE_CRYPTO.kdf,
      hash: AURA_ARCHIVE_CRYPTO.kdfHash,
      iterations: AURA_ARCHIVE_CRYPTO.kdfIterations,
      salt: asBufferSource(salt),
    },
    keyMaterial,
    { name: AURA_ARCHIVE_CRYPTO.algorithm, length: AURA_ARCHIVE_CRYPTO.keyLengthBits },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function createEncryptionContext(passphrase: string): Promise<ArchiveEncryptionContext> {
  validatePassphrase(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(AURA_ARCHIVE_CRYPTO.saltBytes));
  const iv = crypto.getRandomValues(new Uint8Array(AURA_ARCHIVE_CRYPTO.ivBytes));
  return { key: await deriveKey(passphrase, salt), salt, iv };
}

export async function encryptArchivePayload(
  plaintext: Uint8Array,
  context: ArchiveEncryptionContext,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  const encrypted = await crypto.subtle.encrypt(
    {
      name: AURA_ARCHIVE_CRYPTO.algorithm,
      iv: asBufferSource(context.iv),
      additionalData: asBufferSource(additionalData),
      tagLength: AURA_ARCHIVE_CRYPTO.authenticationTagBits,
    },
    context.key,
    asBufferSource(plaintext),
  );
  return new Uint8Array(encrypted);
}

export async function decryptArchivePayload(
  ciphertext: Uint8Array,
  passphrase: string,
  salt: Uint8Array,
  iv: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  try {
    validatePassphrase(passphrase);
    const key = await deriveKey(passphrase, salt);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: AURA_ARCHIVE_CRYPTO.algorithm,
        iv: asBufferSource(iv),
        additionalData: asBufferSource(additionalData),
        tagLength: AURA_ARCHIVE_CRYPTO.authenticationTagBits,
      },
      key,
      asBufferSource(ciphertext),
    );
    return new Uint8Array(decrypted);
  } catch {
    throw new ArchiveDecryptionError();
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
