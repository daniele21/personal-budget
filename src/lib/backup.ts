import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { BackupPayload } from '../data/model';
import { validateAppData, sha256String } from '../domain/archive';

export type { BackupPayload };

export interface BackupSlot {
  ciphertext: string;
  iv: string;
  payloadSha256: string;
  createdAt: string;
}

export interface BackupDocData {
  ciphertext: string;
  iv: string;
  payloadSha256?: string;
  slots?: BackupSlot[];
  updatedAt?: unknown;
}

// ─── Constants ──────────────────────────────────────────────────────

const BACKUP_COLLECTION = 'backups';
const PBKDF2_ITERATIONS = 100_000;
const SALT = new TextEncoder().encode('aura-personal-budget-v1');

// ─── Crypto helpers ─────────────────────────────────────────────────

async function deriveKey(uid: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(uid),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const buffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    ciphertext: arrayBufferToBase64(buffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

async function decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const buffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(ciphertext),
  );
  return new TextDecoder().decode(buffer);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Push an encrypted backup to Firestore with:
 * - Pre-push structural validation (R1)
 * - SHA-256 integrity checksum (R6)
 * - Multi-slot rotation (R2)
 * - Post-push read-back verification (R3)
 * Non-blocking: errors are logged but never thrown.
 */
export async function pushBackup(uid: string, data: BackupPayload): Promise<boolean> {
  try {
    console.log('[Backup] Starting push for user', uid);

    // R1: Pre-push validation
    const validation = validateAppData(data);
    if (validation.warnings.some((w) => w.severity === 'error')) {
      console.warn('[Backup] Push aborted: data validation failed', validation.warnings);
      return false;
    }

    const key = await deriveKey(uid);
    const json = JSON.stringify(data);
    console.log('[Backup] Plaintext size (bytes):', new TextEncoder().encode(json).byteLength);

    // R6: SHA-256 payload checksum
    const payloadSha256 = await sha256String(json);
    const { ciphertext, iv } = await encrypt(json, key);
    console.log('[Backup] Ciphertext size (base64 chars):', ciphertext.length);

    // R2: Multi-slot rotation - fetch existing document to preserve history
    const existingSlots: BackupSlot[] = [];
    try {
      const snap = await getDoc(doc(db, BACKUP_COLLECTION, uid));
      if (snap.exists()) {
        const existingData = snap.data() as BackupDocData;
        if (Array.isArray(existingData.slots) && existingData.slots.length > 0) {
          existingSlots.push(...existingData.slots);
        } else if (existingData.ciphertext && existingData.iv) {
          existingSlots.push({
            ciphertext: existingData.ciphertext,
            iv: existingData.iv,
            payloadSha256: existingData.payloadSha256 ?? '',
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (fetchErr) {
      console.warn('[Backup] Could not fetch existing backup for rotation history:', fetchErr);
    }

    const newSlot: BackupSlot = {
      ciphertext,
      iv,
      payloadSha256,
      createdAt: new Date().toISOString(),
    };
    const slots = [newSlot, ...existingSlots].slice(0, 3);

    await setDoc(doc(db, BACKUP_COLLECTION, uid), {
      ciphertext,
      iv,
      payloadSha256,
      slots,
      updatedAt: serverTimestamp(),
    });

    // R3: Read-back verification
    const readBackSnap = await getDoc(doc(db, BACKUP_COLLECTION, uid));
    if (!readBackSnap.exists()) {
      console.warn('[Backup] Read-back verification failed: document not found after setDoc');
      return false;
    }

    const readBackData = readBackSnap.data() as BackupDocData;
    if (readBackData.payloadSha256 && readBackData.payloadSha256 !== payloadSha256) {
      console.warn('[Backup] Read-back verification failed: SHA-256 mismatch');
      return false;
    }

    const decryptedJson = await decrypt(readBackData.ciphertext, readBackData.iv, key);
    const readBackSha = await sha256String(decryptedJson);
    if (readBackSha !== payloadSha256) {
      console.warn('[Backup] Read-back verification failed: decrypted payload SHA-256 mismatch');
      return false;
    }

    console.log('[Backup] Pushed and verified successfully');
    return true;
  } catch (err) {
    console.warn('[Backup] Push failed (will retry next session):', err);
    return false;
  }
}

/**
 * Pull and decrypt the backup from Firestore.
 * Tries the primary root backup first, falling back to historical slots if needed.
 * Returns null if no backup exists or all decryption/validations fail.
 */
export async function pullBackup(uid: string): Promise<BackupPayload | null> {
  try {
    const snap = await getDoc(doc(db, BACKUP_COLLECTION, uid));
    if (!snap.exists()) {
      console.log('[Backup] No backup found for user');
      return null;
    }

    const docData = snap.data() as BackupDocData;
    const key = await deriveKey(uid);

    const tryDecryptAndValidate = async (
      ciphertext: string,
      iv: string,
      expectedSha?: string,
    ): Promise<BackupPayload | null> => {
      try {
        const json = await decrypt(ciphertext, iv, key);
        if (expectedSha) {
          const sha = await sha256String(json);
          if (sha !== expectedSha) return null;
        }
        const parsed = JSON.parse(json) as BackupPayload;
        const validation = validateAppData(parsed);
        if (validation.warnings.some((w) => w.severity === 'error')) return null;
        return parsed;
      } catch {
        return null;
      }
    };

    // 1. Try root backup slot
    if (docData.ciphertext && docData.iv) {
      const rootResult = await tryDecryptAndValidate(
        docData.ciphertext,
        docData.iv,
        docData.payloadSha256,
      );
      if (rootResult) {
        console.log('[Backup] Pulled primary backup successfully');
        return rootResult;
      }
      console.warn('[Backup] Primary backup slot corrupt or invalid, attempting historical slots fallback');
    }

    // 2. Fallback: Try historical slots in order
    if (Array.isArray(docData.slots)) {
      for (let i = 0; i < docData.slots.length; i++) {
        const slot = docData.slots[i];
        const slotResult = await tryDecryptAndValidate(
          slot.ciphertext,
          slot.iv,
          slot.payloadSha256 || undefined,
        );
        if (slotResult) {
          console.log(`[Backup] Recovered valid backup from historical slot #${i + 1}`);
          return slotResult;
        }
      }
    }

    console.warn('[Backup] All backup slots failed decryption/validation');
    return null;
  } catch (err) {
    console.warn('[Backup] Pull failed:', err);
    return null;
  }
}

/**
 * Delete the cloud backup for a user.
 * Returns true on success, false on failure.
 */
export async function deleteBackup(uid: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, BACKUP_COLLECTION, uid));
    console.log('[Backup] Cloud backup deleted');
    return true;
  } catch (err) {
    console.warn('[Backup] Delete failed:', err);
    return false;
  }
}

