/**
 * Firestore-based user allowlist with privacy and offline support.
 *
 * Design:
 * - Firestore stores only SHA-256 hashes of emails (as doc IDs)
 *   plus a masked version (e.g. "da***@gmail.com") for admin recognition.
 *   No plain-text email ever reaches Firestore.
 * - A local cache of allowed hashes is kept in localStorage so the
 *   PWA works offline. The cache is refreshed on every successful
 *   Firestore read.
 * - The admin email is always allowed regardless of Firestore/cache state.
 */
import {
  collection,
  doc,
  getDocs,
  getDocFromServer,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { STORAGE_KEYS } from '../data/storageKeys';

// ─── Constants ──────────────────────────────────────────────────────

export const ADMIN_EMAIL = 'danielemoltisanti@gmail.com';
const COLLECTION = 'allowedUsers';

// ─── Hashing helpers ────────────────────────────────────────────────

/** SHA-256 hex digest of a normalised email */
export async function hashEmail(email: string): Promise<string> {
  const normalised = email.toLowerCase().trim();
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalised),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Mask an email for display: "daniele@gmail.com" → "da***@gmail.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.toLowerCase().trim().split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

// ─── Local cache ────────────────────────────────────────────────────

export interface CachedAllowedUser {
  hash: string;
  maskedEmail: string;
  addedAt: string;
}

function readCache(): CachedAllowedUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.allowedUsersCache);
    return raw ? (JSON.parse(raw) as CachedAllowedUser[]) : [];
  } catch {
    return [];
  }
}

function writeCache(entries: CachedAllowedUser[]): void {
  localStorage.setItem(STORAGE_KEYS.allowedUsersCache, JSON.stringify(entries));
  localStorage.setItem(STORAGE_KEYS.allowedUsersCacheTs, Date.now().toString());
}

// ─── Admin check ────────────────────────────────────────────────────

export function isAdmin(email: string): boolean {
  return email.toLowerCase().trim() === ADMIN_EMAIL;
}

// ─── Read / check allowlist ─────────────────────────────────────────

/** Pre-computed admin hash (populated lazily). */
let _adminHash: string | null = null;
async function adminHash(): Promise<string> {
  if (!_adminHash) _adminHash = await hashEmail(ADMIN_EMAIL);
  return _adminHash;
}

/**
 * Check whether an email is allowed.
 * 1. Admin email → always true.
 * 2. Try Firestore (updates cache on success).
 * 3. Fall back to local cache if offline.
 */
export async function isEmailAllowed(email: string): Promise<boolean> {
  const lower = email.toLowerCase().trim();
  if (lower === ADMIN_EMAIL) return true;

  const h = await hashEmail(lower);

  // Try Firestore directly (bypass local cache to get a fast server response)
  try {
    const docRef = doc(db, COLLECTION, h);
    const TIMEOUT_MS = 5_000;
    const snap = await Promise.race([
      getDocFromServer(docRef),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), TIMEOUT_MS),
      ),
    ]);
    // Opportunistically refresh full cache in background
    syncCacheInBackground();
    return snap.exists();
  } catch {
    // Offline or timeout — use cache
    console.warn('[AllowedUsers] Firestore unreachable, using local cache');
    const cached = readCache();
    return cached.some((c) => c.hash === h);
  }
}

/** Get all allowed users (Firestore → cache, or cache-only if offline). */
export async function getAllowedUsers(): Promise<CachedAllowedUser[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    const ah = await adminHash();
    const entries: CachedAllowedUser[] = snapshot.docs
      .filter((d) => d.id !== ah) // admin not shown in list
      .map((d) => {
        const data = d.data();
        return {
          hash: d.id,
          maskedEmail: (data.maskedEmail as string) || '***',
          addedAt: data.addedAt?.toDate?.()?.toISOString?.() ?? '',
        };
      });
    writeCache(entries);
    return entries;
  } catch {
    console.warn('[AllowedUsers] Firestore unreachable, returning cache');
    return readCache();
  }
}

/** Add an email to the allowlist (hashed in Firestore, cached locally). */
export async function addAllowedEmail(email: string): Promise<void> {
  const lower = email.toLowerCase().trim();
  if (!lower) throw new Error('Email is required');

  const h = await hashEmail(lower);
  const masked = maskEmail(lower);

  await setDoc(doc(db, COLLECTION, h), {
    maskedEmail: masked,
    addedAt: serverTimestamp(),
  });

  // Update local cache immediately
  const cache = readCache();
  if (!cache.some((c) => c.hash === h)) {
    cache.push({ hash: h, maskedEmail: masked, addedAt: new Date().toISOString() });
    writeCache(cache);
  }
}

/** Remove an email from the allowlist by its hash. */
export async function removeAllowedUser(hash: string): Promise<void> {
  const ah = await adminHash();
  if (hash === ah) throw new Error('Cannot remove admin');

  await deleteDoc(doc(db, COLLECTION, hash));

  // Update local cache
  const cache = readCache().filter((c) => c.hash !== hash);
  writeCache(cache);
}

// ─── Background sync ────────────────────────────────────────────────

let _syncPromise: Promise<void> | null = null;

/** Refresh the local cache from Firestore without blocking the caller. */
function syncCacheInBackground(): void {
  if (_syncPromise) return; // already running
  _syncPromise = getAllowedUsers()
    .then(() => { _syncPromise = null; })
    .catch(() => { _syncPromise = null; });
}
