import { expect, test } from '@playwright/test';
import {
  continueToRestore,
  exportEncryptedArchive,
  openArchiveImport,
  readCanonicalWorkspace,
  restoreIntoEmptyWorkspace,
  seedPortableWorkspace,
  verifyArchiveImport,
  wipeLocalDataThroughUi,
} from './support/portableArchive';

function parseDisplayedCurrency(value: string): number {
  const normalized = value.replace(/[^0-9,.-]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Unable to parse displayed currency value: ${value}`);
  }
  return parsed;
}

test.describe('Aura critical browser journeys', () => {
  test.beforeEach(async ({ page }) => {
    await seedPortableWorkspace(page);
  });

  test('records a current-month expense and updates available-to-spend state', async ({ page }) => {
    await page.goto('/');
    const safeToSpend = page.locator('[data-tour-id="safe-to-spend"]');
    const availableAmount = safeToSpend.locator('p').first();
    await expect(safeToSpend).toBeVisible();
    await expect(availableAmount).toBeVisible();
    const availableBefore = parseDisplayedCurrency(await availableAmount.innerText());

    await page.goto('/add');
    await page.getByRole('button', { name: /Edit amount/ }).click();
    const keypad = page.getByRole('dialog', { name: 'Enter amount' });
    await expect(keypad).toBeVisible();
    await page.keyboard.type('50');
    await page.keyboard.press('Enter');

    await page.getByLabel('Transaction title').fill('Critical journey expense');
    await page.getByRole('button', { name: 'Save expense' }).click();

    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.getByText('Critical journey expense', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const transactions = JSON.parse(localStorage.getItem('aura_transactions') ?? '[]');
      const created = transactions.find((transaction: { title?: string }) => (
        transaction.title === 'Critical journey expense'
      ));
      return created ? { amount: created.amount, type: created.type } : null;
    })).toEqual({ amount: 50, type: 'expense' });

    await page.goto('/');
    await expect(availableAmount).toBeVisible();
    await expect.poll(async () => parseDisplayedCurrency(await availableAmount.innerText()))
      .toBeCloseTo(availableBefore - 50, 2);
  });

  test('exports, clears, and restores the exact portable workspace', async ({ page }) => {
    const before = await readCanonicalWorkspace(page);
    const archive = await exportEncryptedArchive(page);

    await wipeLocalDataThroughUi(page);
    await openArchiveImport(page, archive);
    await verifyArchiveImport(page);
    await continueToRestore(page);
    await restoreIntoEmptyWorkspace(page);

    await expect.poll(() => readCanonicalWorkspace(page)).toEqual(before);
  });
});
