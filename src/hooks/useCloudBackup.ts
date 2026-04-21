/**
 * useCloudBackup — automatic daily encrypted backup to Firestore.
 *
 * Behavior:
 * - On mount (when user is logged in), checks if a backup was already done today.
 * - If not, pushes current local data to Firestore (encrypted, non-blocking).
 * - If local data is empty but a cloud backup exists, sets `backupAvailable = true`
 *   so the UI can prompt the user to restore.
 * - Exposes `restoreFromCloud` for manual restore from the UI.
 * - Never blocks the UI or throws errors to the user.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { pushBackup, pullBackup, deleteBackup, BackupPayload } from '../lib/backup';

const LAST_BACKUP_KEY = 'aura_last_backup_date';

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

interface UseCloudBackupOptions {
  uid: string | null;
  /** Current app data to back up */
  getData: () => BackupPayload;
  /** Returns true when local data is effectively empty */
  isLocalEmpty: () => boolean;
  /** Apply restored data to app state */
  applyData: (data: BackupPayload) => void;
}

export function useCloudBackup({ uid, getData, isLocalEmpty, applyData }: UseCloudBackupOptions) {
  const backupInFlight = useRef(false);
  const [backupAvailable, setBackupAvailable] = useState(false);

  // ─── On login: check if local is empty & cloud backup exists ───
  useEffect(() => {
    if (!uid) return;
    if (!isLocalEmpty()) return;

    pullBackup(uid).then((data) => {
      if (data && (data.transactions?.length ?? 0) > 0) {
        setBackupAvailable(true);
      }
    });
  }, [uid, isLocalEmpty]);

  // ─── Auto daily backup (non-blocking, only if data exists) ─────
  useEffect(() => {
    if (!uid) return;
    if (backupInFlight.current) return;
    if (isLocalEmpty()) return; // don't overwrite cloud with empty data

    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    if (lastBackup === todayString()) return;

    backupInFlight.current = true;
    pushBackup(uid, getData()).then((ok) => {
      if (ok) {
        localStorage.setItem(LAST_BACKUP_KEY, todayString());
      }
      backupInFlight.current = false;
    });
  }, [uid, getData, isLocalEmpty]);

  // ─── Manual restore ─────────────────────────────────────────────
  const restoreFromCloud = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    const data = await pullBackup(uid);
    if (!data) return false;
    applyData(data);
    setBackupAvailable(false);
    return true;
  }, [uid, applyData]);

  const dismissRestore = useCallback(() => setBackupAvailable(false), []);

  const deleteCloudBackup = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    return deleteBackup(uid);
  }, [uid]);

  // Manual immediate push (for UI-triggered testing)
  const pushNow = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    if (isLocalEmpty()) {
      console.warn('[Backup] pushNow skipped: local data is empty');
      return false;
    }
    const ok = await pushBackup(uid, getData());
    if (ok) {
      try {
        localStorage.setItem(LAST_BACKUP_KEY, todayString());
      } catch (_) {
        // ignore storage errors
      }
    }
    return ok;
  }, [uid, getData, isLocalEmpty]);

  return { restoreFromCloud, backupAvailable, dismissRestore, deleteCloudBackup, pushNow };
}
