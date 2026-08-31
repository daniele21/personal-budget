import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { BackupPayload } from '../data/model';
import { validateAppData, sha256String } from '../domain/archive';

export type { BackupPayload };

export interface BackupSlot {
  id: string;
  ciphertext: string;
  iv: string;
  payloadSha256: string;
  createdAt: string;
}

interface BackupVersionMetadata {
  id: string;
  createdAt: string;
}

export interface BackupVersion {
  id: string;
  createdAt: string | null;
  isLatest: boolean;
  position: number;
}

export interface BackupDocData {
  ciphertext: string;
  iv: string;
  payloadSha256?: string;
  slots?: Array<Partial<BackupSlot> & Pick<BackupSlot, 'ciphertext' | 'iv'>>;
  schemaVersion?: number;
  versionIndex?: BackupVersionMetadata[];
  updatedAt?: unknown;
}

// ─── Constants ──────────────────────────────────────────────────────

const BACKUP_COLLECTION = 'backups';
const VERSION_COLLECTION = 'versions';
const BACKUP_SCHEMA_VERSION = 2;
const MAX_BACKUP_VERSIONS = 5;
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
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(buffer);
}

function timestampToIso(value: unknown): string | null {
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
  }
  if (value && typeof value === 'object') {
    const timestamp = value as {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    if (typeof timestamp.seconds === 'number') {
      return new Date(
        (timestamp.seconds * 1_000) + Math.floor((timestamp.nanoseconds ?? 0) / 1_000_000),
      ).toISOString();
    }
  }
  return null;
}

function createVersionId(createdAt: string, payloadSha256: string): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${createdAt}-${payloadSha256.slice(0, 16)}`;
}

function normalizeSlot(
  slot: Partial<BackupSlot> & Pick<BackupSlot, 'ciphertext' | 'iv'>,
  fallbackCreatedAt: string | null,
  index: number,
): BackupSlot {
  const createdAt = timestampToIso(slot.createdAt) ?? fallbackCreatedAt ?? '';
  const payloadSha256 = typeof slot.payloadSha256 === 'string' ? slot.payloadSha256 : '';
  return {
    id: typeof slot.id === 'string' && slot.id
      ? slot.id
      : `${payloadSha256 || 'legacy'}:${createdAt}:${index}`,
    ciphertext: slot.ciphertext,
    iv: slot.iv,
    payloadSha256,
    createdAt,
  };
}

function getHistoricalSlots(docData: BackupDocData): BackupSlot[] {
  const fallbackCreatedAt = timestampToIso(docData.updatedAt);
  if (Array.isArray(docData.slots) && docData.slots.length > 0) {
    return docData.slots
      .filter((slot) => typeof slot?.ciphertext === 'string' && typeof slot?.iv === 'string')
      .slice(0, 3)
      .map((slot, index) => normalizeSlot(slot, fallbackCreatedAt, index));
  }
  if (docData.ciphertext && docData.iv) {
    return [
      normalizeSlot(
        {
          ciphertext: docData.ciphertext,
          iv: docData.iv,
          payloadSha256: docData.payloadSha256,
          createdAt: fallbackCreatedAt ?? undefined,
        },
        fallbackCreatedAt,
        0,
      ),
    ];
  }
  return [];
}

function normalizeVersionIndex(docData: BackupDocData): BackupVersionMetadata[] {
  if (!Array.isArray(docData.versionIndex)) return [];
  const seen = new Set<string>();
  return docData.versionIndex
    .filter((entry): entry is BackupVersionMetadata => (
      typeof entry?.id === 'string' &&
      entry.id.length > 0 &&
      !entry.id.includes('/') &&
      typeof entry.createdAt === 'string' &&
      timestampToIso(entry.createdAt) !== null
    ))
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_BACKUP_VERSIONS);
}

function versionRef(uid: string, versionId: string) {
  return doc(db, BACKUP_COLLECTION, uid, VERSION_COLLECTION, versionId);
}

function safeLegacyVersionId(slot: BackupSlot, index: number): string {
  if (/^[A-Za-z0-9_-]{1,128}$/.test(slot.id)) return slot.id;
  const checksum = slot.payloadSha256 || 'legacy';
  const timestamp = slot.createdAt.replace(/[^0-9]/g, '').slice(0, 17) || 'unknown';
  return `${checksum.slice(0, 40)}-${timestamp}-${index}`;
}

async function loadManagedSlots(uid: string, docData: BackupDocData): Promise<BackupSlot[]> {
  const index = normalizeVersionIndex(docData);
  if (index.length === 0) return getHistoricalSlots(docData);

  const snapshots = await Promise.all(index.map((entry) => getDoc(versionRef(uid, entry.id))));
  return snapshots.flatMap((snapshot, position) => {
    if (!snapshot.exists()) return [];
    const data = snapshot.data() as Partial<BackupSlot>;
    if (typeof data.ciphertext !== 'string' || typeof data.iv !== 'string') return [];
    return [normalizeSlot({
      ...data,
      id: index[position].id,
      createdAt: data.createdAt ?? index[position].createdAt,
      ciphertext: data.ciphertext,
      iv: data.iv,
    }, index[position].createdAt, position)];
  });
}

async function decryptAndValidateSlot(
  slot: Pick<BackupSlot, 'ciphertext' | 'iv' | 'payloadSha256'>,
  key: CryptoKey,
): Promise<BackupPayload | null> {
  try {
    const json = await decrypt(slot.ciphertext, slot.iv, key);
    if (slot.payloadSha256) {
      const sha = await sha256String(json);
      if (sha !== slot.payloadSha256) return null;
    }
    const parsed = JSON.parse(json) as BackupPayload;
    const validation = validateAppData(parsed);
    if (validation.warnings.some((warning) => warning.severity === 'error')) return null;
    return parsed;
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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
    console.log('[Backup] Starting encrypted backup push');

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

    const createdAt = new Date().toISOString();
    const newSlot: BackupSlot = {
      id: createVersionId(createdAt, payloadSha256),
      ciphertext,
      iv,
      payloadSha256,
      createdAt,
    };

    // R2: Transactional rotation prevents concurrent devices from dropping
    // one another's history between the read and write.
    const backupRef = doc(db, BACKUP_COLLECTION, uid);
    await runTransaction(db, async (transaction) => {
      const existingSnap = await transaction.get(backupRef);
      const existingData = existingSnap.exists()
        ? existingSnap.data() as BackupDocData
        : null;
      const existingIndex = existingData ? normalizeVersionIndex(existingData) : [];
      const migratedLegacy = existingData && existingIndex.length === 0
        ? getHistoricalSlots(existingData).map((slot, index) => ({
            ...slot,
            id: safeLegacyVersionId(slot, index),
          }))
        : [];

      for (const slot of migratedLegacy) {
        transaction.set(versionRef(uid, slot.id), {
          ...slot,
          schemaVersion: BACKUP_SCHEMA_VERSION,
        });
      }
      transaction.set(versionRef(uid, newSlot.id), {
        ...newSlot,
        schemaVersion: BACKUP_SCHEMA_VERSION,
      });

      const candidates = [
        { id: newSlot.id, createdAt: newSlot.createdAt },
        ...existingIndex,
        ...migratedLegacy.map(({ id, createdAt }) => ({ id, createdAt })),
      ];
      const seen = new Set<string>();
      const ordered = candidates
        .filter((entry) => {
          if (seen.has(entry.id)) return false;
          seen.add(entry.id);
          return true;
        })
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const versionIndex = ordered.slice(0, MAX_BACKUP_VERSIONS);
      for (const stale of ordered.slice(MAX_BACKUP_VERSIONS)) {
        transaction.delete(versionRef(uid, stale.id));
      }

      transaction.set(backupRef, {
        ciphertext,
        iv,
        payloadSha256,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        versionIndex,
        updatedAt: serverTimestamp(),
      });
    });

    // R3: Read-back verification
    const readBackSnap = await getDoc(backupRef);
    if (!readBackSnap.exists()) {
      console.warn('[Backup] Read-back verification failed: document not found after transaction');
      return false;
    }

    const readBackData = readBackSnap.data() as BackupDocData;
    const readBackSlotSnap = await getDoc(versionRef(uid, newSlot.id));
    const readBackSlot = readBackSlotSnap.exists()
      ? normalizeSlot(readBackSlotSnap.data() as BackupSlot, createdAt, 0)
      : null;
    if (!readBackSlot) {
      console.warn('[Backup] Read-back verification failed: written version not found');
      return false;
    }
    if (readBackSlot.payloadSha256 && readBackSlot.payloadSha256 !== payloadSha256) {
      console.warn('[Backup] Read-back verification failed: SHA-256 mismatch');
      return false;
    }

    const decryptedJson = await decrypt(readBackSlot.ciphertext, readBackSlot.iv, key);
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

    // 1. Try root backup slot
    if (docData.ciphertext && docData.iv) {
      const rootResult = await decryptAndValidateSlot(
        {
          ciphertext: docData.ciphertext,
          iv: docData.iv,
          payloadSha256: docData.payloadSha256 ?? '',
        },
        key,
      );
      if (rootResult) {
        console.log('[Backup] Pulled primary backup successfully');
        return rootResult;
      }
      console.warn('[Backup] Primary backup slot corrupt or invalid, attempting historical slots fallback');
    }

    // 2. Fallback: Try historical slots in order
    const slots = await loadManagedSlots(uid, docData);
    if (slots.length > 0) {
      for (let i = 0; i < slots.length; i++) {
        const slotResult = await decryptAndValidateSlot(slots[i], key);
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
 * List the valid encrypted backup versions available for explicit restore.
 * Invalid or corrupted slots are omitted instead of being offered to the user.
 */
export async function listBackupVersions(uid: string): Promise<BackupVersion[]> {
  try {
    const snap = await getDoc(doc(db, BACKUP_COLLECTION, uid));
    if (!snap.exists()) return [];

    const slots = await loadManagedSlots(uid, snap.data() as BackupDocData);
    const key = await deriveKey(uid);
    const versions: BackupVersion[] = [];
    for (let index = 0; index < slots.length; index++) {
      const data = await decryptAndValidateSlot(slots[index], key);
      if (!data) continue;
      versions.push({
        id: slots[index].id,
        createdAt: slots[index].createdAt || null,
        isLatest: index === 0,
        position: index,
      });
    }
    return versions;
  } catch (err) {
    console.warn('[Backup] Version listing failed:', err);
    return [];
  }
}

/**
 * Pull one explicitly selected backup version.
 * Deliberately does not fall back to another slot: the restored data must match
 * the version the user selected.
 */
export async function pullBackupVersion(
  uid: string,
  versionId: string,
): Promise<BackupPayload | null> {
  try {
    const snap = await getDoc(doc(db, BACKUP_COLLECTION, uid));
    if (!snap.exists()) return null;

    const slot = (await loadManagedSlots(uid, snap.data() as BackupDocData))
      .find((candidate) => candidate.id === versionId);
    if (!slot) return null;

    return decryptAndValidateSlot(slot, await deriveKey(uid));
  } catch (err) {
    console.warn('[Backup] Selected version pull failed:', err);
    return null;
  }
}

/**
 * Delete the cloud backup for a user.
 * Returns true on success, false on failure.
 */
export async function deleteBackup(uid: string): Promise<boolean> {
  try {
    const backupRef = doc(db, BACKUP_COLLECTION, uid);
    const snapshot = await getDoc(backupRef);
    const versionIndex = snapshot.exists()
      ? normalizeVersionIndex(snapshot.data() as BackupDocData)
      : [];
    await runTransaction(db, async (transaction) => {
      for (const version of versionIndex) {
        transaction.delete(versionRef(uid, version.id));
      }
      transaction.delete(backupRef);
    });
    console.log('[Backup] Cloud backup deleted');
    return true;
  } catch (err) {
    console.warn('[Backup] Delete failed:', err);
    return false;
  }
}