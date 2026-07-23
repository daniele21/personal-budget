import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_APP_DATA } from '../../data/model';
import type { BackupPayload } from '../../data/model';
import {
  pushBackup,
  pullBackup,
  pullBackupVersion,
  listBackupVersions,
  deleteBackup,
} from '../backup';

// In-memory Firestore store for testing
const firestoreStore = new Map<string, any>();

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: (_db: any, collection: string, id: string) => `${collection}/${id}`,
  getDoc: async (path: string) => {
    const data = firestoreStore.get(path);
    return {
      exists: () => data !== undefined,
      data: () => data,
    };
  },
  setDoc: async (path: string, payload: any) => {
    firestoreStore.set(path, structuredClone(payload));
  },
  runTransaction: async (_db: any, update: (transaction: any) => Promise<unknown>) => {
    const transaction = {
      get: async (path: string) => {
        const data = firestoreStore.get(path);
        return {
          exists: () => data !== undefined,
          data: () => data,
        };
      },
      set: (path: string, payload: any) => {
        firestoreStore.set(path, structuredClone(payload));
      },
    };
    return update(transaction);
  },
  deleteDoc: async (path: string) => {
    firestoreStore.delete(path);
  },
  serverTimestamp: () => 'MOCK_TIMESTAMP',
}));

describe('lib/backup', () => {
  const uid = 'test-user-123';

  beforeEach(() => {
    firestoreStore.clear();
    vi.restoreAllMocks();
  });

  describe('R1: Pre-push validation', () => {
    it('aborts pushBackup and returns false when data validation fails', async () => {
      const invalidData = {
        ...INITIAL_APP_DATA,
        transactions: [
          {
            id: '', // Invalid empty ID triggers validation error
            amount: 50,
            type: 'expense',
          },
        ],
      } as unknown as BackupPayload;

      const ok = await pushBackup(uid, invalidData);
      expect(ok).toBe(false);
      expect(firestoreStore.has(`backups/${uid}`)).toBe(false);
    });
  });

  describe('R2 & R6 & R3: Push backup with SHA-256, rotation slots, and read-back verification', () => {
    it('pushes valid backup, computes payloadSha256, creates rotation slots, and verifies read-back', async () => {
      const ok = await pushBackup(uid, INITIAL_APP_DATA);
      expect(ok).toBe(true);

      const storedDoc = firestoreStore.get(`backups/${uid}`);
      expect(storedDoc).toBeDefined();
      expect(storedDoc.ciphertext).toBeDefined();
      expect(storedDoc.iv).toBeDefined();
      expect(typeof storedDoc.payloadSha256).toBe('string');
      expect(storedDoc.payloadSha256.length).toBe(64); // SHA-256 hex string length
      expect(Array.isArray(storedDoc.slots)).toBe(true);
      expect(storedDoc.slots.length).toBe(1);
      expect(storedDoc.slots[0].id).toEqual(expect.any(String));
      expect(new Date(storedDoc.slots[0].createdAt).getTime()).not.toBeNaN();
    });

    it('maintains a maximum of 3 historical rotation slots across multiple pushes', async () => {
      const data1 = { ...INITIAL_APP_DATA, monthlyBudget: 1000 };
      const data2 = { ...INITIAL_APP_DATA, monthlyBudget: 2000 };
      const data3 = { ...INITIAL_APP_DATA, monthlyBudget: 3000 };
      const data4 = { ...INITIAL_APP_DATA, monthlyBudget: 4000 };

      await pushBackup(uid, data1);
      await pushBackup(uid, data2);
      await pushBackup(uid, data3);
      await pushBackup(uid, data4);

      const storedDoc = firestoreStore.get(`backups/${uid}`);
      expect(storedDoc.slots.length).toBe(3);
    });

    it('lists exactly the three latest valid versions with their creation dates', async () => {
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 1000 });
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 2000 });
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 3000 });
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 4000 });

      const versions = await listBackupVersions(uid);

      expect(versions).toHaveLength(3);
      expect(versions.map((version) => version.position)).toEqual([0, 1, 2]);
      expect(versions[0].isLatest).toBe(true);
      expect(versions.slice(1).every((version) => !version.isLatest)).toBe(true);
      expect(versions.every((version) => !Number.isNaN(Date.parse(version.createdAt ?? '')))).toBe(true);
    });
  });

  describe('R3: Read-back verification failure', () => {
    it('returns false if post-setDoc read-back returns corrupted SHA-256', async () => {
      const firestore = await import('firebase/firestore');

      // Corrupt data on transaction write so read-back fails SHA check
      vi.spyOn(firestore, 'runTransaction').mockImplementation(async (_db: any, update: any) => {
        const transaction = {
          get: async (path: string) => {
            const data = firestoreStore.get(path);
            return {
              exists: () => data !== undefined,
              data: () => data,
            };
          },
          set: (path: string, payload: any) => {
            const corruptedSlots = structuredClone(payload.slots);
            corruptedSlots[0].payloadSha256 = 'corrupted-sha-256-hash';
            firestoreStore.set(path, {
              ...structuredClone(payload),
              payloadSha256: 'corrupted-sha-256-hash',
              slots: corruptedSlots,
            });
          },
        };
        return update(transaction);
      });

      const ok = await pushBackup(uid, INITIAL_APP_DATA);
      expect(ok).toBe(false);
    });
  });

  describe('pullBackup and historical slot fallback', () => {
    it('returns null when no cloud backup exists', async () => {
      const pulled = await pullBackup(uid);
      expect(pulled).toBeNull();
    });

    it('successfully pulls and decrypts a valid cloud backup', async () => {
      const data = { ...INITIAL_APP_DATA, monthlyBudget: 2500 };
      await pushBackup(uid, data);

      const pulled = await pullBackup(uid);
      expect(pulled).not.toBeNull();
      expect(pulled?.monthlyBudget).toBe(2500);
    });

    it('falls back to a historical slot if the root and latest backup slots are corrupted', async () => {
      // 1. Push a valid first backup (monthlyBudget: 1500)
      const validHistoricalData = { ...INITIAL_APP_DATA, monthlyBudget: 1500 };
      await pushBackup(uid, validHistoricalData);

      // 2. Push a second valid backup (monthlyBudget: 3000)
      const data2 = { ...INITIAL_APP_DATA, monthlyBudget: 3000 };
      await pushBackup(uid, data2);

      const storedDoc = firestoreStore.get(`backups/${uid}`);

      // Case A: Corrupt root ciphertext -> recovers from slot #0 (3000)
      storedDoc.ciphertext = 'CORRUPTED_CIPHERTEXT_BASE64==';
      const pulledRootCorrupted = await pullBackup(uid);
      expect(pulledRootCorrupted).not.toBeNull();
      expect(pulledRootCorrupted?.monthlyBudget).toBe(3000);

      // Case B: Corrupt slot #0 as well -> falls back to historical slot #1 (1500)
      storedDoc.slots[0].ciphertext = 'CORRUPTED_CIPHERTEXT_BASE64==';
      const pulledBothCorrupted = await pullBackup(uid);
      expect(pulledBothCorrupted).not.toBeNull();
      expect(pulledBothCorrupted?.monthlyBudget).toBe(1500);
    });

    it('restores the explicitly selected previous version without falling back to the latest', async () => {
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 1500 });
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 3000 });
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 4500 });

      const versions = await listBackupVersions(uid);
      const previous = await pullBackupVersion(uid, versions[1].id);

      expect(previous?.monthlyBudget).toBe(3000);
    });

    it('does not silently restore another version when the selected slot is corrupted', async () => {
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 1500 });
      await pushBackup(uid, { ...INITIAL_APP_DATA, monthlyBudget: 3000 });

      const versions = await listBackupVersions(uid);
      const storedDoc = firestoreStore.get(`backups/${uid}`);
      storedDoc.slots[1].ciphertext = 'CORRUPTED_CIPHERTEXT_BASE64==';

      const selected = await pullBackupVersion(uid, versions[1].id);

      expect(selected).toBeNull();
    });
  });

  describe('deleteBackup', () => {
    it('deletes cloud backup from Firestore', async () => {
      await pushBackup(uid, INITIAL_APP_DATA);
      expect(firestoreStore.has(`backups/${uid}`)).toBe(true);

      const deleted = await deleteBackup(uid);
      expect(deleted).toBe(true);
      expect(firestoreStore.has(`backups/${uid}`)).toBe(false);
    });
  });
});
