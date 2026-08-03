import { expect, type Page } from '@playwright/test';
import type { RestoreJournalStatus } from '../../../src/domain/archive';
import type { CanonicalWorkspace } from './portableArchive';
import { readCanonicalWorkspace } from './portableArchive';

const TARGET_ATTACHMENT_DATA_URL = 'data:image/png;base64,AQIDBA==';

export const DISCARD_CHECKPOINTS: RestoreJournalStatus[] = [
  'prepared',
  'rollback-staged',
  'attachments-staged',
];

export const RESUME_CHECKPOINTS: RestoreJournalStatus[] = [
  'data-committing',
  'data-committed',
  'attachments-committed',
  'verified',
  'completed',
];

export const ROLLBACK_CHECKPOINTS: RestoreJournalStatus[] = [
  'rolling-back',
  'rolled-back',
  'failed',
];

interface InstalledCheckpoint {
  previous: CanonicalWorkspace;
  target: CanonicalWorkspace;
}

async function installCheckpoint(
  page: Page,
  status: RestoreJournalStatus,
): Promise<InstalledCheckpoint> {
  return page.evaluate(async ({ checkpointStatus, targetAttachmentDataUrl }) => {
    const archiveModule = '/src/domain/archive/index.ts';
    const appDataModule = '/src/repositories/appDataRepository.ts';
    const attachmentModule = '/src/repositories/attachmentRepository.ts';
    const preferencesModule = '/src/repositories/portablePreferencesRepository.ts';
    const journalModule = '/src/repositories/restoreJournalRepository.ts';
    const snapshotModule = '/src/services/archive/archiveSnapshotService.ts';

    const {
      canonicalStringify,
      sha256String,
    } = await import(archiveModule);
    const { appDataRepository } = await import(appDataModule);
    const { attachmentRepository } = await import(attachmentModule);
    const { portablePreferencesRepository } = await import(preferencesModule);
    const { restoreJournalRepository } = await import(journalModule);
    const { archiveSnapshotService } = await import(snapshotModule);

    const previous = await archiveSnapshotService.collect(appDataRepository.loadAppDataStrict());
    if (previous.warnings.length > 0 || previous.attachments.length !== 1) {
      throw new Error('The E2E checkpoint fixture must start from one complete attachment.');
    }

    const targetData = structuredClone(previous.data);
    const targetTransactionIndex = targetData.transactions.findIndex(
      ({ id }: { id: string }) => id === 'e2e-tx-receipt',
    );
    if (targetTransactionIndex < 0) {
      throw new Error('The checkpoint fixture transaction is missing.');
    }
    targetData.transactions[targetTransactionIndex] = {
      ...targetData.transactions[targetTransactionIndex],
      title: `Recovered at ${checkpointStatus}`,
      description: 'Checkpoint recovery target',
    };
    const targetPreferences = structuredClone(previous.preferences);
    targetPreferences.appearance.darkMode = !targetPreferences.appearance.darkMode;
    targetPreferences.customReminders = targetPreferences.customReminders.map((reminder: { title: string }) => ({
      ...reminder,
      title: `${reminder.title} recovered`,
    }));
    const targetAttachment = {
      transactionId: previous.attachments[0].transactionId,
      mediaType: 'image/png',
      byteLength: 4,
      dataUrl: targetAttachmentDataUrl,
    };
    const target = {
      data: targetData,
      preferences: targetPreferences,
      attachments: [targetAttachment],
      warnings: [],
    };

    const targetDataSha256 = await sha256String(canonicalStringify({
      data: target.data,
      preferences: target.preferences,
      attachments: target.attachments,
    }));
    const restoreId = `e2e-${checkpointStatus}-${Date.now()}`;
    const resumeStatuses = new Set([
      'data-committing',
      'data-committed',
      'attachments-committed',
      'verified',
      'completed',
    ]);
    const targetAttachmentCommitted = new Set([
      'attachments-committed',
      'verified',
      'completed',
      'rolling-back',
      'failed',
    ]);
    const targetCoreCommitted = resumeStatuses.has(checkpointStatus) ||
      checkpointStatus === 'rolling-back' ||
      checkpointStatus === 'failed';

    await attachmentRepository.clearAllAttachments();
    appDataRepository.saveAppDataStrict(targetCoreCommitted ? target.data : previous.data);
    portablePreferencesRepository.save(targetCoreCommitted ? target.preferences : previous.preferences);
    const currentAttachment = targetAttachmentCommitted.has(checkpointStatus)
      ? targetAttachment
      : previous.attachments[0];
    await attachmentRepository.saveAttachment(
      currentAttachment.transactionId,
      currentAttachment.dataUrl,
    );

    const previousSnapshotKey = await restoreJournalRepository.saveSnapshot(
      restoreId,
      'previous',
      previous,
    );
    const targetSnapshotKey = await restoreJournalRepository.saveSnapshot(
      restoreId,
      'target',
      target,
    );

    if ([
      'attachments-staged',
      'data-committing',
      'data-committed',
    ].includes(checkpointStatus)) {
      await attachmentRepository.stageAttachments(restoreId, target.attachments);
    }

    const now = new Date().toISOString();
    restoreJournalRepository.saveJournal({
      version: 1,
      restoreId,
      archiveId: `e2e-archive-${checkpointStatus}`,
      status: checkpointStatus,
      startedAt: now,
      updatedAt: now,
      hadExistingData: true,
      targetDataSha256,
      previousSnapshotKey,
      targetSnapshotKey,
    });
    window.localStorage.setItem('aura_restore_in_progress', 'true');

    const toCanonical = (snapshot: typeof previous) => ({
      data: JSON.parse(JSON.stringify(snapshot.data)),
      preferences: JSON.parse(JSON.stringify(snapshot.preferences)),
      attachmentDataUrl: snapshot.attachments[0]?.dataUrl ?? null,
    });

    return {
      previous: toCanonical(previous),
      target: toCanonical(target),
    };
  }, {
    checkpointStatus: status,
    targetAttachmentDataUrl: TARGET_ATTACHMENT_DATA_URL,
  });
}

export async function recoverCheckpoint(
  page: Page,
  status: RestoreJournalStatus,
  expected: 'previous' | 'target',
): Promise<void> {
  const snapshots = await installCheckpoint(page, status);
  await page.reload();

  await expect(page.getByRole('button', { name: 'Export complete archive' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    journal: window.localStorage.getItem('aura_restore_journal_v1'),
    inProgress: window.localStorage.getItem('aura_restore_in_progress'),
  }))).toEqual({ journal: null, inProgress: null });
  await expect.poll(() => readCanonicalWorkspace(page)).toEqual(snapshots[expected]);
}
