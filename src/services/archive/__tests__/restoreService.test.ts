import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_APP_DATA } from '../../../data/model';
import { STORAGE_KEYS } from '../../../data/storageKeys';
import {
  canonicalStringify,
  sha256String,
  type AuraRestoreJournalV1,
  type PortableSnapshot,
  type PreparedRestore,
} from '../../../domain/archive';
import {
  TEST_APP_DATA,
  TEST_ATTACHMENT,
  TEST_PREFERENCES,
  buildEmptyArchivePayload,
  buildValidArchivePayload,
} from '../../../domain/archive/__tests__/fixtures';

const mocks = vi.hoisted(() => ({
  data: {} as typeof TEST_APP_DATA,
  preferences: {} as typeof TEST_PREFERENCES,
  attachments: [] as typeof TEST_ATTACHMENT[],
  staged: [] as typeof TEST_ATTACHMENT[],
  journal: null as AuraRestoreJournalV1 | null,
  snapshots: new Map<string, PortableSnapshot>(),
  failPreferenceSaveOnce: false,
  failSnapshotSaveOnce: false,
  statusHistory: [] as AuraRestoreJournalV1['status'][],
  safetyBuilder: vi.fn(),
}));

vi.mock('../../../repositories/appDataRepository', () => ({
  appDataRepository: {
    loadAppDataStrict: () => structuredClone(mocks.data),
    saveAppDataStrict: (data: typeof TEST_APP_DATA) => { mocks.data = structuredClone(data); },
  },
}));

vi.mock('../../../repositories/portablePreferencesRepository', () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: {
    enabled: false,
    budgetAlerts: true,
    recurringReminders: true,
    customReminders: true,
    reminderLeadDays: 1,
  },
  portablePreferencesRepository: {
    load: () => structuredClone(mocks.preferences),
    save: (preferences: typeof TEST_PREFERENCES) => {
      if (mocks.failPreferenceSaveOnce) {
        mocks.failPreferenceSaveOnce = false;
        throw new Error('Injected preference write failure');
      }
      mocks.preferences = structuredClone(preferences);
    },
  },
}));

vi.mock('../../../repositories/attachmentRepository', () => ({
  attachmentRepository: {
    listAttachments: async () => ({
      attachments: structuredClone(mocks.attachments),
      warnings: [],
      orphanedTransactionIds: [],
    }),
    stageAttachments: async (_restoreId: string, attachments: typeof TEST_ATTACHMENT[]) => {
      mocks.staged = structuredClone(attachments);
    },
    commitStagedAttachments: async () => {
      mocks.attachments = structuredClone(mocks.staged);
      mocks.staged = [];
      return mocks.attachments.map((attachment) => attachment.transactionId);
    },
    rollbackStagedAttachments: async () => { mocks.staged = []; },
    cleanupOrphanAttachments: async (validIds: Iterable<string>) => {
      const valid = new Set(validIds);
      mocks.attachments = mocks.attachments.filter((attachment) => valid.has(attachment.transactionId));
      return [];
    },
  },
}));

vi.mock('../../../repositories/restoreJournalRepository', () => ({
  restoreJournalRepository: {
    loadJournal: () => mocks.journal,
    saveJournal: (journal: AuraRestoreJournalV1) => { mocks.journal = structuredClone(journal); },
    updateStatus: (journal: AuraRestoreJournalV1, status: AuraRestoreJournalV1['status'], lastErrorCode?: string) => {
      mocks.statusHistory.push(status);
      const updated = { ...journal, status, updatedAt: new Date().toISOString(), lastErrorCode };
      mocks.journal = updated;
      return updated;
    },
    clearJournal: () => { mocks.journal = null; },
    saveSnapshot: async (restoreId: string, kind: string, snapshot: PortableSnapshot) => {
      if (mocks.failSnapshotSaveOnce) {
        mocks.failSnapshotSaveOnce = false;
        throw new Error('Injected storage quota failure');
      }
      const key = `${restoreId}/${kind}`;
      mocks.snapshots.set(key, structuredClone(snapshot));
      return key;
    },
    loadSnapshot: async (key: string) => structuredClone(mocks.snapshots.get(key)!),
    cleanupRestore: async (restoreId: string) => {
      for (const key of [...mocks.snapshots.keys()]) {
        if (key.startsWith(`${restoreId}/`)) mocks.snapshots.delete(key);
      }
    },
  },
}));

vi.mock('../archiveBuilder', () => ({
  buildPortableArchiveFromSnapshot: mocks.safetyBuilder,
}));

import { recoverInterruptedRestore, restorePreparedArchive } from '../restoreService';

const DEFAULT_PREFERENCES = {
  notificationPreferences: {
    enabled: false,
    budgetAlerts: true,
    recurringReminders: true,
    customReminders: true,
    reminderLeadDays: 1,
  },
  customReminders: [],
  appearance: { darkMode: false },
};

const storedValues = new Map<string, string>();
const localStorageMock: Storage = {
  get length() { return storedValues.size; },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => { storedValues.delete(key); },
  setItem: (key, value) => { storedValues.set(key, String(value)); },
};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorageMock,
  });
});

async function preparedRestore(): Promise<PreparedRestore> {
  const payload = await buildValidArchivePayload();
  return {
    data: structuredClone(payload.data),
    preferences: structuredClone(payload.preferences),
    attachments: new Map(payload.attachments.map((attachment) => [attachment.transactionId, attachment])),
    manifest: payload.manifest,
    warnings: [],
  };
}

beforeEach(() => {
  localStorage.clear();
  mocks.data = structuredClone(INITIAL_APP_DATA);
  mocks.preferences = structuredClone(DEFAULT_PREFERENCES) as typeof TEST_PREFERENCES;
  mocks.attachments = [];
  mocks.staged = [];
  mocks.journal = null;
  mocks.snapshots.clear();
  mocks.failPreferenceSaveOnce = false;
  mocks.failSnapshotSaveOnce = false;
  mocks.statusHistory = [];
  mocks.safetyBuilder.mockReset();
});

describe('restoreService', () => {
  it('commits and verifies data, preferences, and attachments before cleanup', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await restorePreparedArchive(await preparedRestore());

    expect(result.safetyCopyCreated).toBe(false);
    expect(mocks.data).toEqual(TEST_APP_DATA);
    expect(mocks.preferences).toEqual(TEST_PREFERENCES);
    expect(mocks.attachments).toEqual([TEST_ATTACHMENT]);
    expect(mocks.journal).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.restoreInProgress)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mocks.statusHistory).toEqual([
      'rollback-staged',
      'attachments-staged',
      'data-committing',
      'data-committed',
      'attachments-committed',
      'verified',
      'completed',
    ]);
  });

  it('rolls back all stores after an injected commit failure', async () => {
    const previousData = structuredClone(mocks.data);
    const previousPreferences = structuredClone(mocks.preferences);
    mocks.failPreferenceSaveOnce = true;

    await expect(restorePreparedArchive(await preparedRestore())).rejects.toMatchObject({
      code: 'restore_failed',
    });

    expect(mocks.data).toEqual(previousData);
    expect(mocks.preferences).toEqual(previousPreferences);
    expect(mocks.attachments).toEqual([]);
    expect(mocks.journal).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.restoreInProgress)).toBeNull();
  });

  it('requires a verified safety copy before replacing meaningful current data', async () => {
    mocks.data = structuredClone(TEST_APP_DATA);
    mocks.preferences = structuredClone(TEST_PREFERENCES);
    mocks.attachments = [structuredClone(TEST_ATTACHMENT)];
    mocks.safetyBuilder.mockResolvedValue({
      blob: new Blob(['verified']),
      filename: 'aura-backup-2026-07-22.aura',
      manifest: { archiveId: 'safety' },
      encrypted: false,
      byteLength: 8,
    });
    const onSafetyArchiveReady = vi.fn().mockResolvedValue(true);

    const result = await restorePreparedArchive(await preparedRestore(), {
      confirmReplaceExisting: true,
      onSafetyArchiveReady,
    });

    expect(result.safetyCopyCreated).toBe(true);
    expect(onSafetyArchiveReady).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'aura-safety-before-restore-2026-07-22.aura',
    }));
  });

  it('does not mutate current data when safety confirmation or staging capacity is unavailable', async () => {
    mocks.data = structuredClone(TEST_APP_DATA);
    const previous = structuredClone(mocks.data);
    await expect(restorePreparedArchive(await preparedRestore())).rejects.toMatchObject({
      code: 'replace_confirmation_required',
    });
    expect(mocks.data).toEqual(previous);

    mocks.data = structuredClone(INITIAL_APP_DATA);
    mocks.failSnapshotSaveOnce = true;
    await expect(restorePreparedArchive(await preparedRestore())).rejects.toThrow('storage quota');
    expect(mocks.data).toEqual(INITIAL_APP_DATA);
    expect(mocks.journal).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.restoreInProgress)).toBeNull();
  });

  it('blocks when the safety download is declined and supports an explicitly confirmed empty target', async () => {
    mocks.data = structuredClone(TEST_APP_DATA);
    mocks.preferences = structuredClone(TEST_PREFERENCES);
    mocks.attachments = [structuredClone(TEST_ATTACHMENT)];
    const previous = structuredClone(mocks.data);
    mocks.safetyBuilder.mockResolvedValue({
      blob: new Blob(['verified']),
      filename: 'aura-backup-2026-07-22.aura',
      manifest: { archiveId: 'safety' },
      encrypted: true,
      byteLength: 8,
    });

    await expect(restorePreparedArchive(await preparedRestore(), {
      confirmReplaceExisting: true,
      safetyCopyPassphrase: 'safety passphrase',
      onSafetyArchiveReady: async () => false,
    })).rejects.toMatchObject({ code: 'safety_copy_not_saved' });
    expect(mocks.data).toEqual(previous);

    const emptyPayload = await buildEmptyArchivePayload();
    const emptyPrepared: PreparedRestore = {
      data: emptyPayload.data,
      preferences: emptyPayload.preferences,
      attachments: new Map(),
      manifest: emptyPayload.manifest,
      warnings: [],
    };
    await restorePreparedArchive(emptyPrepared, {
      confirmReplaceExisting: true,
      safetyCopyPassphrase: 'safety passphrase',
      onSafetyArchiveReady: async () => true,
    });

    expect(mocks.data.transactions).toEqual([]);
    expect(mocks.data.accounts).toEqual([]);
    expect(mocks.attachments).toEqual([]);
  });

  it('cleans an interrupted pre-commit restore without mutating current data', async () => {
    const target = await preparedRestore();
    const targetSnapshot: PortableSnapshot = {
      data: target.data,
      preferences: target.preferences,
      attachments: [...target.attachments.values()],
      warnings: [],
    };
    const restoreId = 'restore-interrupted';
    mocks.snapshots.set(`${restoreId}/target`, targetSnapshot);
    mocks.snapshots.set(`${restoreId}/previous`, {
      data: structuredClone(mocks.data),
      preferences: structuredClone(mocks.preferences),
      attachments: [],
      warnings: [],
    });
    mocks.staged = [structuredClone(TEST_ATTACHMENT)];
    mocks.journal = {
      version: 1,
      restoreId,
      archiveId: target.manifest.archiveId,
      status: 'attachments-staged',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hadExistingData: false,
      targetDataSha256: await sha256String(canonicalStringify(targetSnapshot)),
      previousSnapshotKey: `${restoreId}/previous`,
      targetSnapshotKey: `${restoreId}/target`,
    };
    localStorage.setItem(STORAGE_KEYS.restoreInProgress, 'true');

    await recoverInterruptedRestore();

    expect(mocks.data).toEqual(INITIAL_APP_DATA);
    expect(mocks.staged).toEqual([]);
    expect(mocks.journal).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.restoreInProgress)).toBeNull();
  });

  it('resumes an interrupted post-core commit and verifies target attachments', async () => {
    const target = await preparedRestore();
    const targetSnapshot: PortableSnapshot = {
      data: target.data,
      preferences: target.preferences,
      attachments: [...target.attachments.values()],
      warnings: [],
    };
    const restoreId = 'restore-resume';
    mocks.data = structuredClone(target.data);
    mocks.preferences = structuredClone(target.preferences);
    mocks.attachments = [];
    mocks.snapshots.set(`${restoreId}/target`, targetSnapshot);
    mocks.snapshots.set(`${restoreId}/previous`, {
      data: structuredClone(INITIAL_APP_DATA),
      preferences: structuredClone(DEFAULT_PREFERENCES) as typeof TEST_PREFERENCES,
      attachments: [],
      warnings: [],
    });
    const targetDataSha256 = await sha256String(canonicalStringify({
      data: targetSnapshot.data,
      preferences: targetSnapshot.preferences,
      attachments: targetSnapshot.attachments,
    }));
    mocks.journal = {
      version: 1,
      restoreId,
      archiveId: target.manifest.archiveId,
      status: 'data-committed',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hadExistingData: false,
      targetDataSha256,
      previousSnapshotKey: `${restoreId}/previous`,
      targetSnapshotKey: `${restoreId}/target`,
    };

    await recoverInterruptedRestore();

    expect(mocks.data).toEqual(TEST_APP_DATA);
    expect(mocks.attachments).toEqual([TEST_ATTACHMENT]);
    expect(mocks.journal).toBeNull();
  });

  it('assigns every journal checkpoint a deterministic startup recovery path', async () => {
    const target = await preparedRestore();
    const targetSnapshot: PortableSnapshot = {
      data: target.data,
      preferences: target.preferences,
      attachments: [...target.attachments.values()],
      warnings: [],
    };
    const previousSnapshot: PortableSnapshot = {
      data: structuredClone(INITIAL_APP_DATA),
      preferences: structuredClone(DEFAULT_PREFERENCES) as typeof TEST_PREFERENCES,
      attachments: [],
      warnings: [],
    };
    const targetDataSha256 = await sha256String(canonicalStringify({
      data: targetSnapshot.data,
      preferences: targetSnapshot.preferences,
      attachments: targetSnapshot.attachments,
    }));
    const resumeStatuses: AuraRestoreJournalV1['status'][] = [
      'data-committing',
      'data-committed',
      'attachments-committed',
      'verified',
      'completed',
    ];
    const discardStatuses: AuraRestoreJournalV1['status'][] = [
      'prepared',
      'rollback-staged',
      'attachments-staged',
    ];
    const rollbackStatuses: AuraRestoreJournalV1['status'][] = [
      'rolling-back',
      'rolled-back',
      'failed',
    ];

    for (const status of [...discardStatuses, ...resumeStatuses, ...rollbackStatuses]) {
      const restoreId = `restore-${status}`;
      mocks.snapshots.clear();
      mocks.snapshots.set(`${restoreId}/target`, structuredClone(targetSnapshot));
      mocks.snapshots.set(`${restoreId}/previous`, structuredClone(previousSnapshot));
      mocks.staged = status === 'attachments-staged' ? [structuredClone(TEST_ATTACHMENT)] : [];

      if (resumeStatuses.includes(status)) {
        mocks.data = structuredClone(target.data);
        mocks.preferences = structuredClone(target.preferences);
        mocks.attachments = status === 'data-committing' || status === 'data-committed'
          ? []
          : [structuredClone(TEST_ATTACHMENT)];
      } else if (rollbackStatuses.includes(status)) {
        mocks.data = status === 'rolled-back' ? structuredClone(INITIAL_APP_DATA) : structuredClone(target.data);
        mocks.preferences = status === 'rolled-back'
          ? structuredClone(DEFAULT_PREFERENCES) as typeof TEST_PREFERENCES
          : structuredClone(target.preferences);
        mocks.attachments = status === 'rolled-back' ? [] : [structuredClone(TEST_ATTACHMENT)];
      } else {
        mocks.data = structuredClone(INITIAL_APP_DATA);
        mocks.preferences = structuredClone(DEFAULT_PREFERENCES) as typeof TEST_PREFERENCES;
        mocks.attachments = [];
      }

      const now = new Date().toISOString();
      mocks.journal = {
        version: 1,
        restoreId,
        archiveId: target.manifest.archiveId,
        status,
        startedAt: now,
        updatedAt: now,
        hadExistingData: false,
        targetDataSha256,
        previousSnapshotKey: `${restoreId}/previous`,
        targetSnapshotKey: `${restoreId}/target`,
      };

      await recoverInterruptedRestore();

      if (resumeStatuses.includes(status)) {
        expect(mocks.data, status).toEqual(TEST_APP_DATA);
        expect(mocks.attachments, status).toEqual([TEST_ATTACHMENT]);
      } else {
        expect(mocks.data, status).toEqual(INITIAL_APP_DATA);
        expect(mocks.attachments, status).toEqual([]);
      }
      expect(mocks.journal, status).toBeNull();
    }
  });
});
