import { expect, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { AppData } from '../../../src/data/model';
import type { AuraPortablePreferences } from '../../../src/domain/archive';
import {
  E2E_APP_DATA,
  E2E_ARCHIVE_PASSPHRASE,
  E2E_ATTACHMENT,
  E2E_PREFERENCES,
} from '../fixtures/portableWorkspace';

const ARCHIVE_MEDIA_TYPE = 'application/vnd.aura.portable-archive';

const STORAGE_KEYS = {
  transactions: 'aura_transactions',
  budgets: 'aura_budgets',
  recurring: 'aura_recurring',
  categories: 'aura_categories_list',
  archivedCategories: 'aura_archived_categories_list',
  accounts: 'aura_accounts',
  savingsGoals: 'aura_savings_goals',
  monthlyBudget: 'aura_monthly_budget',
  notificationPreferences: 'aura_notification_preferences',
  customReminders: 'aura_custom_reminders',
  darkMode: 'aura_dark_mode',
  cloudBackupEnabled: 'aura_cloud_backup_enabled',
  onboardingComplete: 'aura_onboarding_complete',
  initialDataChoice: 'aura_initial_data_choice',
  guidedTourComplete: 'aura_guided_tour_complete',
} as const;

export interface CanonicalWorkspace {
  data: AppData;
  preferences: AuraPortablePreferences;
  attachmentDataUrl: string | null;
}

export interface DownloadedArchive {
  name: string;
  buffer: Buffer;
}

export async function seedPortableWorkspace(page: Page): Promise<void> {
  await page.addInitScript(({ data, preferences, keys }) => {
    if (window.sessionStorage.getItem('aura_e2e_keep_empty_shell_after_reset') === 'true') {
      window.localStorage.setItem(keys.cloudBackupEnabled, JSON.stringify(false));
      window.localStorage.setItem(keys.onboardingComplete, 'true');
      window.localStorage.setItem(keys.initialDataChoice, 'blank');
      window.localStorage.setItem(keys.guidedTourComplete, 'true');
      window.sessionStorage.removeItem('aura_e2e_keep_empty_shell_after_reset');
      return;
    }
    if (window.sessionStorage.getItem('aura_e2e_fixture_seeded') === 'true') return;

    window.localStorage.setItem(keys.transactions, JSON.stringify(data.transactions));
    window.localStorage.setItem(keys.budgets, JSON.stringify(data.budgets));
    window.localStorage.setItem(keys.recurring, JSON.stringify(data.recurring));
    window.localStorage.setItem(keys.accounts, JSON.stringify(data.accounts));
    window.localStorage.setItem(keys.categories, JSON.stringify(data.categories));
    window.localStorage.setItem(keys.archivedCategories, JSON.stringify(data.archivedCategories));
    window.localStorage.setItem(keys.savingsGoals, JSON.stringify(data.savingsGoals));
    window.localStorage.setItem(keys.monthlyBudget, JSON.stringify(data.monthlyBudget));
    window.localStorage.setItem(keys.notificationPreferences, JSON.stringify(preferences.notificationPreferences));
    window.localStorage.setItem(keys.customReminders, JSON.stringify(preferences.customReminders));
    window.localStorage.setItem(keys.darkMode, JSON.stringify(preferences.appearance.darkMode));
    window.localStorage.setItem(keys.cloudBackupEnabled, JSON.stringify(false));
    window.localStorage.setItem(keys.onboardingComplete, 'true');
    window.localStorage.setItem(keys.initialDataChoice, 'restored');
    window.localStorage.setItem(keys.guidedTourComplete, 'true');
    window.sessionStorage.setItem('aura_e2e_fixture_seeded', 'true');
  }, {
    data: E2E_APP_DATA,
    preferences: E2E_PREFERENCES,
    keys: STORAGE_KEYS,
  });

  await page.goto('/data');
  await expect(page.getByRole('button', { name: 'Export complete archive' })).toBeVisible();
  await page.evaluate(async ({ transactionId, dataUrl }) => {
    const repositoryModule = '/src/repositories/attachmentRepository.ts';
    const { attachmentRepository } = await import(repositoryModule);
    await attachmentRepository.saveAttachment(transactionId, dataUrl);
  }, E2E_ATTACHMENT);
}

export async function readCanonicalWorkspace(page: Page): Promise<CanonicalWorkspace> {
  return page.evaluate(async ({ keys, attachmentId }) => {
    const parse = <T>(key: string, fallback: T): T => {
      const stored = window.localStorage.getItem(key);
      return stored === null ? fallback : JSON.parse(stored) as T;
    };
    const repositoryModule = '/src/repositories/attachmentRepository.ts';
    const { attachmentRepository } = await import(repositoryModule);

    return {
      data: {
        transactions: parse(keys.transactions, []),
        budgets: parse(keys.budgets, []),
        recurring: parse(keys.recurring, []),
        accounts: parse(keys.accounts, []),
        categories: parse(keys.categories, []),
        archivedCategories: parse(keys.archivedCategories, []),
        savingsGoals: parse(keys.savingsGoals, []),
        monthlyBudget: parse(keys.monthlyBudget, 0),
      },
      preferences: {
        notificationPreferences: parse(keys.notificationPreferences, {
          enabled: false,
          budgetAlerts: true,
          recurringReminders: true,
          customReminders: true,
          reminderLeadDays: 1,
        }),
        customReminders: parse(keys.customReminders, []),
        appearance: { darkMode: parse(keys.darkMode, false) },
      },
      attachmentDataUrl: await attachmentRepository.getAttachment(attachmentId) ?? null,
    };
  }, { keys: STORAGE_KEYS, attachmentId: E2E_ATTACHMENT.transactionId });
}

async function downloadToBuffer(download: Download): Promise<DownloadedArchive> {
  const path = await download.path();
  if (!path) throw new Error('Playwright did not expose the downloaded archive path.');
  return {
    name: download.suggestedFilename(),
    buffer: await readFile(path),
  };
}

export async function exportEncryptedArchive(page: Page): Promise<DownloadedArchive> {
  await page.goto('/data');
  await page.getByRole('button', { name: 'Export complete archive' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export complete Aura archive' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('5', { exact: true }).first()).toBeVisible();
  await dialog.getByLabel('Passphrase', { exact: true }).fill(E2E_ARCHIVE_PASSPHRASE);
  await dialog.getByLabel('Confirm passphrase').fill(E2E_ARCHIVE_PASSPHRASE);

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Create and download archive' }).click();
  const archive = await downloadToBuffer(await downloadPromise);
  await expect(dialog.getByText('Archive verified and downloaded.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  return archive;
}

export async function openArchiveImport(page: Page, archive: DownloadedArchive): Promise<void> {
  await page.goto('/data');
  await page.getByRole('button', { name: 'Import Aura archive' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import Aura archive' });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: archive.name,
    mimeType: ARCHIVE_MEDIA_TYPE,
    buffer: archive.buffer,
  });
  await expect(dialog.getByLabel('Archive passphrase')).toBeVisible();
}

export async function verifyArchiveImport(
  page: Page,
  passphrase = E2E_ARCHIVE_PASSPHRASE,
): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Import Aura archive' });
  await dialog.getByLabel('Archive passphrase').fill(passphrase);
  await dialog.getByRole('button', { name: 'Verify archive' }).click();
}

export async function continueToRestore(page: Page): Promise<void> {
  const importDialog = page.getByRole('dialog', { name: 'Import Aura archive' });
  await expect(importDialog.getByRole('button', { name: 'Continue to replace data' })).toBeVisible();
  await importDialog.getByRole('button', { name: 'Continue to replace data' }).click();
  await expect(page.getByRole('dialog', { name: 'Replace current Aura data' })).toBeVisible();
}

export async function wipeLocalDataThroughUi(page: Page): Promise<void> {
  await page.goto('/data');
  await page.evaluate(() => {
    window.sessionStorage.setItem('aura_e2e_keep_empty_shell_after_reset', 'true');
  });
  await page.getByRole('button', { name: 'Delete local data', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Delete local data' });
  const reloaded = page.waitForEvent('load');
  await confirmation.getByRole('button', { name: 'Delete local data', exact: true }).click();
  await reloaded;
  await expect(page.getByRole('button', { name: 'Export complete archive' })).toBeVisible();
  await expect.poll(async () => {
    const snapshot = await readCanonicalWorkspace(page);
    return {
      transactions: snapshot.data.transactions.length,
      budgets: snapshot.data.budgets.length,
      recurring: snapshot.data.recurring.length,
      attachment: snapshot.attachmentDataUrl,
    };
  }).toEqual({ transactions: 0, budgets: 0, recurring: 0, attachment: null });
}

export async function restoreIntoEmptyWorkspace(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Replace current Aura data' });
  await dialog.getByLabel(/I understand that current Aura data/).check();
  const reloaded = page.waitForEvent('load');
  await dialog.getByRole('button', { name: 'Replace with verified archive' }).click();
  await reloaded;
  await expect(page.getByRole('button', { name: 'Export complete archive' })).toBeVisible();
}

export function tamperArchive(archive: DownloadedArchive): DownloadedArchive {
  const buffer = Buffer.from(archive.buffer);
  buffer[buffer.length - 1] ^= 0xff;
  return { ...archive, name: `tampered-${archive.name}`, buffer };
}
