import { del, get, keys, set } from 'idb-keyval';
import {
  AURA_RESTORE_JOURNAL_KEY,
  AURA_RESTORE_STAGING_PREFIX,
  type AuraRestoreJournalV1,
  type PortableSnapshot,
  type RestoreJournalStatus,
} from '../domain/archive';

type SnapshotKind = 'previous' | 'target';

const RESTORE_STATUSES = new Set<RestoreJournalStatus>([
  'prepared',
  'rollback-staged',
  'attachments-staged',
  'data-committing',
  'data-committed',
  'attachments-committed',
  'verified',
  'rolling-back',
  'rolled-back',
  'completed',
  'failed',
]);

function snapshotKey(restoreId: string, kind: SnapshotKind): string {
  return `${AURA_RESTORE_STAGING_PREFIX}${encodeURIComponent(restoreId)}/snapshots/${kind}`;
}

function isJournal(value: unknown): value is AuraRestoreJournalV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const journal = value as Partial<AuraRestoreJournalV1>;
  return journal.version === 1 &&
    typeof journal.restoreId === 'string' &&
    typeof journal.archiveId === 'string' &&
    typeof journal.status === 'string' &&
    RESTORE_STATUSES.has(journal.status as RestoreJournalStatus) &&
    typeof journal.startedAt === 'string' &&
    typeof journal.updatedAt === 'string' &&
    typeof journal.hadExistingData === 'boolean' &&
    typeof journal.targetDataSha256 === 'string' &&
    typeof journal.targetSnapshotKey === 'string';
}

export const restoreJournalRepository = {
  loadJournal(): AuraRestoreJournalV1 | null {
    const raw = window.localStorage.getItem(AURA_RESTORE_JOURNAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isJournal(parsed)) throw new Error('The Aura restore journal is invalid.');
    return parsed;
  },

  saveJournal(journal: AuraRestoreJournalV1): void {
    window.localStorage.setItem(AURA_RESTORE_JOURNAL_KEY, JSON.stringify(journal));
  },

  updateStatus(journal: AuraRestoreJournalV1, status: RestoreJournalStatus, lastErrorCode?: string): AuraRestoreJournalV1 {
    const updated: AuraRestoreJournalV1 = {
      ...journal,
      status,
      updatedAt: new Date().toISOString(),
      lastErrorCode,
    };
    restoreJournalRepository.saveJournal(updated);
    return updated;
  },

  clearJournal(): void {
    window.localStorage.removeItem(AURA_RESTORE_JOURNAL_KEY);
  },

  async saveSnapshot(restoreId: string, kind: SnapshotKind, snapshot: PortableSnapshot): Promise<string> {
    const key = snapshotKey(restoreId, kind);
    await set(key, snapshot);
    return key;
  },

  async loadSnapshot(key: string): Promise<PortableSnapshot> {
    const snapshot = await get(key);
    if (!snapshot || typeof snapshot !== 'object') throw new Error('Restore snapshot is unavailable.');
    return snapshot as PortableSnapshot;
  },

  async cleanupRestore(restoreId: string): Promise<void> {
    const prefix = `${AURA_RESTORE_STAGING_PREFIX}${encodeURIComponent(restoreId)}/`;
    const restoreKeys = (await keys()).filter((key): key is string => (
      typeof key === 'string' && key.startsWith(prefix)
    ));
    await Promise.all(restoreKeys.map((key) => del(key)));
  },
};
