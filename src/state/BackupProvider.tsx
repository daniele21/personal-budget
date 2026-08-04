import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../data/storageKeys';
import { useAuth } from './AuthProvider';
import { useAppData } from './AppDataProvider';
import { useCloudBackup } from '../hooks/useCloudBackup';
import { BackupPayload, syncAppData, isFinancialDataEmpty, normalizeAppData } from '../data/model';
import type { BackupVersion } from '../lib/backup';

interface BackupContextType {
  cloudBackupEnabled: boolean;
  setCloudBackupEnabled: (v: boolean) => void;
  backupAvailable: boolean;
  backupStatus: 'idle' | 'syncing' | 'success' | 'error' | 'skipped';
  lastBackupDate: string | null;
  backupCheckComplete: boolean;
  backupCheckTimedOut: boolean;
  continueOffline: () => void;
  backupVersions: BackupVersion[];
  backupVersionsLoading: boolean;
  refreshBackupVersions: () => Promise<BackupVersion[]>;
  restoreFromCloud: (versionId?: string) => Promise<boolean>;
  dismissRestore: () => void;
  deleteCloudBackup: () => Promise<boolean>;
  pushBackupNow: () => Promise<boolean>;
}

const BackupContext = createContext<BackupContextType | null>(null);

export const BackupProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const {
    state,
    dispatch
  } = useAppData();

  const [cloudBackupEnabled, setCloudBackupEnabled] = useLocalStorage<boolean>(STORAGE_KEYS.cloudBackupEnabled, false);

  const getBackupData = useCallback((): BackupPayload => {
    return syncAppData({
      transactions: state.transactions,
      budgets: state.budgets,
      recurring: state.recurring,
      accounts: state.accounts,
      categories: state.categories,
      archivedCategories: state.archivedCategories,
      savingsGoals: state.savingsGoals,
      monthlyBudget: state.monthlyBudget,
    });
  }, [state]);

  const isLocalEmpty = useCallback(
    () => isFinancialDataEmpty({
      transactions: state.transactions,
      budgets: state.budgets,
      recurring: state.recurring
    }),
    [state.transactions, state.budgets, state.recurring]
  );

  const applyBackupData = useCallback((data: BackupPayload) => {
    const normalizedData = normalizeAppData(data);
    dispatch({ type: 'data/hydrated', data: normalizedData });
  }, [dispatch]);

  const {
    restoreFromCloud,
    backupAvailable,
    backupCheckComplete,
    backupCheckTimedOut,
    continueOffline,
    backupVersions,
    backupVersionsLoading,
    refreshBackupVersions,
    dismissRestore,
    deleteCloudBackup,
    pushNow,
    backupStatus,
    lastBackupDate
  } = useCloudBackup({
    uid: user?.id ?? null,
    enabled: cloudBackupEnabled,
    getData: getBackupData,
    isLocalEmpty,
    applyData: applyBackupData,
  });

  const pushBackupNow = useCallback(async (): Promise<boolean> => {
    if (typeof pushNow === 'function') {
      return await pushNow();
    }
    return false;
  }, [pushNow]);

  return (
    <BackupContext.Provider
      value={{
        cloudBackupEnabled,
        setCloudBackupEnabled,
        backupAvailable,
        backupStatus,
        lastBackupDate,
        backupCheckComplete,
        backupCheckTimedOut,
        continueOffline,
        backupVersions,
        backupVersionsLoading,
        refreshBackupVersions,
        restoreFromCloud,
        dismissRestore,
        deleteCloudBackup,
        pushBackupNow
      }}
    >
      {children}
    </BackupContext.Provider>
  );
};

export function useBackup() {
  const ctx = useContext(BackupContext);
  if (!ctx) throw new Error('useBackup must be used within BackupProvider');
  return ctx;
}
