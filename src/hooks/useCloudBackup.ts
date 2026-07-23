/**
 * useCloudBackup — automatic daily encrypted backup to Firestore.
 *
 * Behavior:
 * - Runs only after the user explicitly enables cloud backup.
 * - On mount (when enabled and logged in), checks if a backup was already done today.
 * - If not, pushes current local data to Firestore (encrypted, non-blocking).
 * - If local data is empty but a cloud backup exists, sets `backupAvailable = true`
 *   so the UI can prompt the user to restore.
 * - Exposes `restoreFromCloud` for manual restore from the UI.
 * - Never blocks the UI or throws errors to the user.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { pushBackup, pullBackup, deleteBackup, BackupPayload } from '../lib/backup';
import { STORAGE_KEYS } from '../data/storageKeys';

const LAST_BACKUP_KEY = 'aura_last_backup_date';
type BackupStatus = 'idle' | 'syncing' | 'success' | 'error' | 'skipped';

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

interface UseCloudBackupOptions {
  uid: string | null;
  enabled: boolean;
  /** Current app data to back up */
  getData: () => BackupPayload;
  /** Returns true when local data is effectively empty */
  isLocalEmpty: () => boolean;
  /** Apply restored data to app state */
  applyData: (data: BackupPayload) => void;
}

function hasBackupData(data: BackupPayload | null): data is BackupPayload {
  if (!data) return false;
  return (
    (data.transactions?.length ?? 0) > 0 ||
    (data.budgets?.length ?? 0) > 0 ||
    (data.recurring?.length ?? 0) > 0 ||
    (data.savingsGoals?.length ?? 0) > 0 ||
    (data.accounts?.length ?? 0) > 0
  );
}

function restoreIsInProgress(): boolean {
  return window.localStorage.getItem(STORAGE_KEYS.restoreInProgress) === 'true';
}

export function useCloudBackup({ uid, enabled, getData, isLocalEmpty, applyData }: UseCloudBackupOptions) {
  const backupInFlight = useRef(false);
  const backupCheckUid = useRef<string | null>(null);
  const [backupAvailable, setBackupAvailable] = useState(false);
  const [backupCheckComplete, setBackupCheckComplete] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle');
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_BACKUP_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (restoreIsInProgress()) return;
    if (!enabled) {
      setBackupAvailable(false);
      setBackupStatus('idle');
    }
  }, [enabled]);

  // ─── On login: check if local is empty & cloud backup exists ───
  useEffect(() => {
    if (restoreIsInProgress()) return;
    if (!uid) {
      backupCheckUid.current = null;
      setBackupAvailable(false);
      setBackupCheckComplete(true);
      return;
    }

    if (!isLocalEmpty()) {
      backupCheckUid.current = uid;
      setBackupAvailable(false);
      setBackupCheckComplete(true);
      return;
    }

    if (backupCheckUid.current === uid) return;

    let cancelled = false;
    backupCheckUid.current = uid;
    setBackupAvailable(false);
    setBackupCheckComplete(false);
    pullBackup(uid).then((data) => {
      if (cancelled) return;
      if (hasBackupData(data)) {
        setBackupAvailable(true);
      }
      setBackupCheckComplete(true);
    });

    return () => {
      cancelled = true;
    };
  }, [uid, enabled, isLocalEmpty]);

  // ─── Auto daily backup (non-blocking, only if data exists) ─────
  useEffect(() => {
    if (restoreIsInProgress()) return;
    if (!uid) return;
    if (!enabled) return;
    if (backupInFlight.current) return;
    if (isLocalEmpty()) {
      setBackupStatus('skipped');
      return; // don't overwrite cloud with empty data
    }

    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    if (lastBackup === todayString()) return;

    backupInFlight.current = true;
    setBackupStatus('syncing');
    pushBackup(uid, getData()).then((ok) => {
      if (ok) {
        localStorage.setItem(LAST_BACKUP_KEY, todayString());
        setLastBackupDate(todayString());
        setBackupStatus('success');
      } else {
        setBackupStatus('error');
      }
      backupInFlight.current = false;
    });
  }, [uid, enabled, getData, isLocalEmpty]);

  // ─── Manual restore ─────────────────────────────────────────────
  const restoreFromCloud = useCallback(async (): Promise<boolean> => {
    if (restoreIsInProgress()) return false;
    if (!uid) return false;
    const data = await pullBackup(uid);
    if (!data) return false;
    applyData(data);
    setBackupAvailable(false);
    setBackupCheckComplete(true);
    return true;
  }, [uid, applyData]);

  const dismissRestore = useCallback(() => setBackupAvailable(false), []);

  const deleteCloudBackup = useCallback(async (): Promise<boolean> => {
    if (!uid) return false;
    const ok = await deleteBackup(uid);
    if (ok) {
      localStorage.removeItem(LAST_BACKUP_KEY);
      setLastBackupDate(null);
      setBackupAvailable(false);
      setBackupStatus('idle');
    }
    return ok;
  }, [uid]);

  // Manual immediate push (for UI-triggered testing)
  const pushNow = useCallback(async (): Promise<boolean> => {
    if (restoreIsInProgress()) return false;
    if (!uid) return false;
    if (!enabled) {
      setBackupStatus('skipped');
      return false;
    }
    if (isLocalEmpty()) {
      console.warn('[Backup] pushNow skipped: local data is empty');
      setBackupStatus('skipped');
      return false;
    }
    setBackupStatus('syncing');
    const ok = await pushBackup(uid, getData());
    if (ok) {
      try {
        localStorage.setItem(LAST_BACKUP_KEY, todayString());
        setLastBackupDate(todayString());
      } catch (_) {
        // ignore storage errors
      }
      setBackupStatus('success');
    } else {
      setBackupStatus('error');
    }
    return ok;
  }, [uid, enabled, getData, isLocalEmpty]);

  return { restoreFromCloud, backupAvailable, backupCheckComplete, dismissRestore, deleteCloudBackup, pushNow, backupStatus, lastBackupDate };
}
