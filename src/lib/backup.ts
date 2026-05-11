/**
 * Encrypted cloud backup via Firestore.
 *
 * Design:
 * - AES-256-GCM encryption via Web Crypto API
 * - Key derived with PBKDF2 from Firebase UID + static salt
 * - One Firestore document per user: /backups/{userId}
 * - Non-blocking: all operations are fire-and-forget from the caller's perspective
 * - Offline-tolerant: failures are logged, never thrown to the UI
 */
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { BackupPayload } from '../data/model';

export type { BackupPayload };

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
 * Push an encrypted backup to Firestore.
 * Non-blocking: errors are logged but never thrown.
 */
export async function pushBackup(uid: string, data: BackupPayload): Promise<boolean> {
  try {
    console.log('[Backup] Starting push for user', uid);
    const key = await deriveKey(uid);
    const json = JSON.stringify(data);
    console.log('[Backup] Plaintext size (bytes):', new TextEncoder().encode(json).byteLength);
    const { ciphertext, iv } = await encrypt(json, key);
    console.log('[Backup] Ciphertext size (base64 chars):', ciphertext.length);

    await setDoc(doc(db, BACKUP_COLLECTION, uid), {
      ciphertext,
      iv,
      updatedAt: serverTimestamp(),
    });

    console.log('[Backup] Pushed successfully');
    return true;
  } catch (err) {
    console.warn('[Backup] Push failed (will retry next session):', err);
    return false;
  }
}

/**
 * Pull and decrypt the backup from Firestore.
 * Returns null if no backup exists or decryption fails.
 */
export async function pullBackup(uid: string): Promise<BackupPayload | null> {
  try {
    const snap = await getDoc(doc(db, BACKUP_COLLECTION, uid));
    if (!snap.exists()) {
      console.log('[Backup] No backup found for user');
      return null;
    }

    const { ciphertext, iv } = snap.data() as { ciphertext: string; iv: string };
    const key = await deriveKey(uid);
    const json = await decrypt(ciphertext, iv, key);
    const parsed = JSON.parse(json) as BackupPayload;

    console.log('[Backup] Pulled successfully');
    return parsed;
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
