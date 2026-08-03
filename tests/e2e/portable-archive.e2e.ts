import { expect, test } from '@playwright/test';
import { E2E_ARCHIVE_PASSPHRASE } from './fixtures/portableWorkspace';
import {
  continueToRestore,
  exportEncryptedArchive,
  openArchiveImport,
  readCanonicalWorkspace,
  restoreIntoEmptyWorkspace,
  seedPortableWorkspace,
  tamperArchive,
  verifyArchiveImport,
  wipeLocalDataThroughUi,
} from './support/portableArchive';

test.describe('Aura portable archive recovery', () => {
  test.beforeEach(async ({ page }) => {
    await seedPortableWorkspace(page);
  });

  test('authenticates with the synthetic non-admin E2E user @cross-browser @mobile', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toHaveCount(0);
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page.getByRole('img', { name: 'Aura E2E Test User' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin Panel' })).toHaveCount(0);
  });

  test('exports a verified encrypted archive through the browser download flow @cross-browser', async ({ page }) => {
    const archive = await exportEncryptedArchive(page);

    expect(archive.name).toMatch(/\.aura$/);
    expect(archive.buffer.subarray(0, 8).toString('utf8')).toBe('AURAARC1');
    expect(archive.buffer.byteLength).toBeGreaterThan(1_000);
  });

  test('restores the exact workspace after export and local-data deletion @cross-browser @mobile', async ({ page }) => {
    const before = await readCanonicalWorkspace(page);
    const archive = await exportEncryptedArchive(page);

    await wipeLocalDataThroughUi(page);
    await openArchiveImport(page, archive);
    await verifyArchiveImport(page);
    await continueToRestore(page);
    await restoreIntoEmptyWorkspace(page);

    await expect.poll(() => readCanonicalWorkspace(page)).toEqual(before);
  });

  test('rejects a wrong passphrase without changing current data @cross-browser', async ({ page }) => {
    const before = await readCanonicalWorkspace(page);
    const archive = await exportEncryptedArchive(page);

    await openArchiveImport(page, archive);
    await verifyArchiveImport(page, 'wrong-passphrase-2026');

    const dialog = page.getByRole('dialog', { name: 'Import Aura archive' });
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue to replace data' })).toHaveCount(0);
    expect(await readCanonicalWorkspace(page)).toEqual(before);
  });

  test('rejects a tampered archive without changing current data @cross-browser', async ({ page }) => {
    const before = await readCanonicalWorkspace(page);
    const archive = tamperArchive(await exportEncryptedArchive(page));

    await openArchiveImport(page, archive);
    await verifyArchiveImport(page);

    const dialog = page.getByRole('dialog', { name: 'Import Aura archive' });
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue to replace data' })).toHaveCount(0);
    expect(await readCanonicalWorkspace(page)).toEqual(before);
  });

  test('downloads a safety copy before replacing a non-empty workspace @cross-browser', async ({ page }) => {
    const original = await readCanonicalWorkspace(page);
    const archive = await exportEncryptedArchive(page);

    await page.evaluate(() => {
      const transactions = JSON.parse(window.localStorage.getItem('aura_transactions') ?? '[]');
      const transaction = transactions.find(({ id }: { id: string }) => id === 'e2e-tx-receipt');
      if (!transaction) throw new Error('The portable archive fixture transaction is missing.');
      transaction.title = 'Workspace changed after export';
      window.localStorage.setItem('aura_transactions', JSON.stringify(transactions));
    });
    await page.reload();
    expect((await readCanonicalWorkspace(page)).data.transactions
      .find(({ id }) => id === 'e2e-tx-receipt')?.title)
      .toBe('Workspace changed after export');

    await openArchiveImport(page, archive);
    await verifyArchiveImport(page);
    await continueToRestore(page);

    const dialog = page.getByRole('dialog', { name: 'Replace current Aura data' });
    await expect(dialog.getByText('Safety copy required')).toBeVisible();
    await expect(dialog.getByLabel('Safety-copy passphrase')).toHaveValue(E2E_ARCHIVE_PASSPHRASE);
    await dialog.getByLabel(/I understand that current Aura data/).check();

    const safetyDownload = page.waitForEvent('download');
    const reloaded = page.waitForEvent('load');
    await dialog.getByRole('button', { name: 'Download safety copy and replace data' }).click();
    expect((await safetyDownload).suggestedFilename()).toMatch(/\.aura$/);
    await reloaded;

    await expect.poll(() => readCanonicalWorkspace(page)).toEqual(original);
  });
});
