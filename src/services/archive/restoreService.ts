import { INITIAL_APP_DATA } from '../../data/model';
import { STORAGE_KEYS } from '../../data/storageKeys';
import {
  RestoreError,
  RestoreRollbackError,
  canonicalStringify,
  sha256String,
  type AuraRestoreJournalV1,
  type PortableSnapshot,
  type PreparedRestore,
} from '../../domain/archive';
import { appDataRepository } from '../../repositories/appDataRepository';
import { attachmentRepository } from '../../repositories/attachmentRepository';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  portablePreferencesRepository,
} from '../../repositories/portablePreferencesRepository';
import { restoreJournalRepository } from '../../repositories/restoreJournalRepository';
import { archiveSnapshotService } from './archiveSnapshotService';
import {
  buildPortableArchiveFromSnapshot,
  type BuiltPortableArchive,
} from './archiveBuilder';

export type RestorePhase =
  | 'preparing'
  | 'creating-safety-copy'
  | 'staging'
  | 'committing'
  | 'verifying'
  | 'rolling-back'
  | 'complete';

export interface RestoreOptions {
  acceptWarnings?: boolean;
  confirmReplaceExisting?: boolean;
  safetyCopyPassphrase?: string;
  onSafetyArchiveReady?: (archive: BuiltPortableArchive) => Promise<boolean>;
  onProgress?: (phase: RestorePhase) => void;
}

export interface RestoreResult {
  restoreId: string;
  safetyCopyCreated: boolean;
}

export interface CurrentRestoreImpact {
  hasMeaningfulData: boolean;
  canCreateCompleteSafetyCopy: boolean;
}

function setRestoreFlag(active: boolean): void {
  if (active) window.localStorage.setItem(STORAGE_KEYS.restoreInProgress, 'true');
  else window.localStorage.removeItem(STORAGE_KEYS.restoreInProgress);
}

function preparedSnapshot(prepared: PreparedRestore): PortableSnapshot {
  return {
    data: prepared.data,
    preferences: prepared.preferences,
    attachments: [...prepared.attachments.values()].sort((a, b) => (
      a.transactionId.localeCompare(b.transactionId)
    )),
    warnings: prepared.warnings,
  };
}

async function snapshotFingerprint(snapshot: PortableSnapshot): Promise<string> {
  return sha256String(canonicalStringify({
    data: snapshot.data,
    preferences: snapshot.preferences,
    attachments: [...snapshot.attachments].sort((a, b) => (
      a.transactionId.localeCompare(b.transactionId)
    )),
  }));
}

async function coreFingerprint(snapshot: Pick<PortableSnapshot, 'data' | 'preferences'>): Promise<string> {
  return sha256String(canonicalStringify({
    data: snapshot.data,
    preferences: snapshot.preferences,
  }));
}

function hasMeaningfulData(snapshot: PortableSnapshot): boolean {
  const defaultPreferences = {
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    customReminders: [],
    appearance: { darkMode: false },
  };
  return canonicalStringify(snapshot.data) !== canonicalStringify(INITIAL_APP_DATA) ||
    snapshot.attachments.length > 0 ||
    canonicalStringify(snapshot.preferences) !== canonicalStringify(defaultPreferences);
}

export async function assessCurrentRestoreImpact(): Promise<CurrentRestoreImpact> {
  const snapshot = await currentSnapshot();
  return {
    hasMeaningfulData: hasMeaningfulData(snapshot),
    canCreateCompleteSafetyCopy: snapshot.warnings.length === 0,
  };
}

async function applySnapshot(restoreId: string, snapshot: PortableSnapshot): Promise<void> {
  appDataRepository.saveAppDataStrict(snapshot.data);
  portablePreferencesRepository.save(snapshot.preferences);
  await attachmentRepository.stageAttachments(restoreId, snapshot.attachments);
  await attachmentRepository.commitStagedAttachments(restoreId);
  await attachmentRepository.cleanupOrphanAttachments(
    snapshot.data.transactions.map((transaction) => transaction.id),
  );
}

async function currentSnapshot(): Promise<PortableSnapshot> {
  return archiveSnapshotService.collect(appDataRepository.loadAppDataStrict());
}

async function assertCurrentSnapshot(expectedHash: string): Promise<void> {
  const actual = await currentSnapshot();
  if (actual.warnings.length > 0 || await snapshotFingerprint(actual) !== expectedHash) {
    throw new RestoreError('restore_verification_failed', 'The restored Aura data could not be verified.');
  }
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return 'restore_failed';
}

async function rollback(journal: AuraRestoreJournalV1): Promise<void> {
  if (!journal.previousSnapshotKey) {
    throw new RestoreRollbackError('The rollback snapshot is unavailable.');
  }
  const previous = await restoreJournalRepository.loadSnapshot(journal.previousSnapshotKey);
  const previousHash = await snapshotFingerprint(previous);
  await applySnapshot(journal.restoreId, previous);
  await assertCurrentSnapshot(previousHash);
}

async function cleanupCompletedRestore(journal: AuraRestoreJournalV1): Promise<void> {
  await restoreJournalRepository.cleanupRestore(journal.restoreId);
  restoreJournalRepository.clearJournal();
  setRestoreFlag(false);
}

export async function restorePreparedArchive(
  prepared: PreparedRestore,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  if (prepared.warnings.length > 0 && !options.acceptWarnings) {
    throw new RestoreError(
      'restore_warnings_not_accepted',
      'Review and accept the archive warnings before restoring.',
    );
  }
  if (restoreJournalRepository.loadJournal()) {
    throw new RestoreError('restore_already_in_progress', 'Another Aura restore requires recovery first.');
  }

  options.onProgress?.('preparing');
  setRestoreFlag(true);
  const restoreId = crypto.randomUUID?.() ?? `restore-${Date.now()}`;
  let journal: AuraRestoreJournalV1 | null = null;
  let safetyCopyCreated = false;

  try {
    const previous = await currentSnapshot();
    const target = preparedSnapshot(prepared);
    const targetDataSha256 = await snapshotFingerprint(target);
    const hadExistingData = hasMeaningfulData(previous);

    if (hadExistingData) {
      if (!options.confirmReplaceExisting) {
        throw new RestoreError(
          'replace_confirmation_required',
          'Confirm that the current Aura workspace will be replaced before continuing.',
        );
      }
      if (previous.warnings.length > 0) {
        throw new RestoreError(
          'safety_copy_incomplete',
          'Aura cannot overwrite the current data because a complete safety copy cannot be created.',
        );
      }
      if (!options.onSafetyArchiveReady) {
        throw new RestoreError(
          'safety_copy_required',
          'A verified safety copy must be saved before replacing existing Aura data.',
        );
      }
      options.onProgress?.('creating-safety-copy');
      const safetyArchive = await buildPortableArchiveFromSnapshot(previous, {
        passphrase: options.safetyCopyPassphrase,
      });
      const accepted = await options.onSafetyArchiveReady({
        ...safetyArchive,
        filename: safetyArchive.filename.replace('aura-backup-', 'aura-safety-before-restore-'),
      });
      if (!accepted) {
        throw new RestoreError(
          'safety_copy_not_saved',
          'Restore cancelled because the safety copy was not saved.',
        );
      }
      safetyCopyCreated = true;
    }

    options.onProgress?.('staging');
    const previousSnapshotKey = await restoreJournalRepository.saveSnapshot(restoreId, 'previous', previous);
    const targetSnapshotKey = await restoreJournalRepository.saveSnapshot(restoreId, 'target', target);
    const now = new Date().toISOString();
    journal = {
      version: 1,
      restoreId,
      archiveId: prepared.manifest.archiveId,
      status: 'prepared',
      startedAt: now,
      updatedAt: now,
      hadExistingData,
      targetDataSha256,
      previousSnapshotKey,
      targetSnapshotKey,
    };
    restoreJournalRepository.saveJournal(journal);
    journal = restoreJournalRepository.updateStatus(journal, 'rollback-staged');
    await attachmentRepository.stageAttachments(restoreId, target.attachments);
    journal = restoreJournalRepository.updateStatus(journal, 'attachments-staged');

    options.onProgress?.('committing');
    journal = restoreJournalRepository.updateStatus(journal, 'data-committing');
    appDataRepository.saveAppDataStrict(target.data);
    portablePreferencesRepository.save(target.preferences);
    journal = restoreJournalRepository.updateStatus(journal, 'data-committed');
    await attachmentRepository.commitStagedAttachments(restoreId);
    await attachmentRepository.cleanupOrphanAttachments(
      target.data.transactions.map((transaction) => transaction.id),
    );
    journal = restoreJournalRepository.updateStatus(journal, 'attachments-committed');

    options.onProgress?.('verifying');
    await assertCurrentSnapshot(targetDataSha256);
    journal = restoreJournalRepository.updateStatus(journal, 'verified');
    journal = restoreJournalRepository.updateStatus(journal, 'completed');
    await cleanupCompletedRestore(journal);
    options.onProgress?.('complete');
    return { restoreId, safetyCopyCreated };
  } catch (error) {
    if (!journal) {
      await restoreJournalRepository.cleanupRestore(restoreId).catch(() => undefined);
      setRestoreFlag(false);
      throw error;
    }
    if (journal.status === 'completed' || journal.status === 'verified') {
      throw new RestoreError(
        'restore_cleanup_pending',
        'The data was restored and verified, but Aura must finish recovery cleanup before continuing.',
        error,
      );
    }
    try {
      options.onProgress?.('rolling-back');
      journal = restoreJournalRepository.updateStatus(journal, 'rolling-back', errorCode(error));
      await rollback(journal);
      journal = restoreJournalRepository.updateStatus(journal, 'rolled-back', errorCode(error));
      await cleanupCompletedRestore(journal);
    } catch (rollbackError) {
      restoreJournalRepository.updateStatus(journal, 'failed', errorCode(rollbackError));
      throw new RestoreRollbackError(rollbackError);
    }
    throw error instanceof RestoreError
      ? error
      : new RestoreError('restore_failed', 'Aura could not restore this archive. Existing data was recovered.', error);
  }
}

let recoveryPromise: Promise<void> | null = null;

async function recoverInterruptedRestoreInternal(): Promise<void> {
  const journal = restoreJournalRepository.loadJournal();
  if (!journal) {
    setRestoreFlag(false);
    return;
  }
  setRestoreFlag(true);

  try {
    if (journal.status === 'completed' || journal.status === 'verified') {
      await assertCurrentSnapshot(journal.targetDataSha256);
      await cleanupCompletedRestore(journal);
      return;
    }

    const target = await restoreJournalRepository.loadSnapshot(journal.targetSnapshotKey);
    const current = await currentSnapshot();
    const currentHash = await snapshotFingerprint(current);
    const targetAlreadyCommitted = current.warnings.length === 0 && currentHash === journal.targetDataSha256;
    const targetCoreCommitted = await coreFingerprint(current) === await coreFingerprint(target);

    if (
      (targetAlreadyCommitted ||
        journal.status === 'data-committed' ||
        journal.status === 'attachments-committed' ||
        (journal.status === 'data-committing' && targetCoreCommitted)) &&
      (journal.status === 'data-committing' ||
        journal.status === 'data-committed' ||
        journal.status === 'attachments-committed')
    ) {
      await applySnapshot(journal.restoreId, target);
      await assertCurrentSnapshot(journal.targetDataSha256);
      const completed = restoreJournalRepository.updateStatus(journal, 'completed');
      await cleanupCompletedRestore(completed);
      return;
    }

    if (journal.status === 'prepared' || journal.status === 'rollback-staged' || journal.status === 'attachments-staged') {
      await attachmentRepository.rollbackStagedAttachments(journal.restoreId);
      await cleanupCompletedRestore(journal);
      return;
    }

    const rollingBack = restoreJournalRepository.updateStatus(journal, 'rolling-back');
    await rollback(rollingBack);
    const rolledBack = restoreJournalRepository.updateStatus(rollingBack, 'rolled-back');
    await cleanupCompletedRestore(rolledBack);
  } catch (error) {
    restoreJournalRepository.updateStatus(journal, 'failed', errorCode(error));
    throw new RestoreRollbackError(error);
  }
}

export function recoverInterruptedRestore(): Promise<void> {
  recoveryPromise ??= recoverInterruptedRestoreInternal().finally(() => {
    recoveryPromise = null;
  });
  return recoveryPromise;
}
