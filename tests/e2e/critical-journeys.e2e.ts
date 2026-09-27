import { expect, test } from '@playwright/test';
import { seedImportWorkspace } from './support/transactionImport';
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


test.describe('Deterministic-first import critical journey', () => {
  test.beforeEach(async ({ page }) => {
    await seedImportWorkspace(page);
  });

  test('maps a localized quoted-row statement locally before review', async ({ page }) => {
    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    const csv = [
      '"Data Operazione;Causale;Uscite;Entrate"',
      '"12/09/2026;SUPERMERCATO;43,20;"',
      '"13/09/2026;STIPENDIO;;2100,00"',
      '"14/09/2026;RISTORANTE;31,50;"',
    ].join('\n');

    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'localized-bank.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await wizard.getByRole('button', { name: 'Analyze file' }).click();

    await expect(wizard.getByText('Check what Aura found')).toBeVisible();
    await expect(wizard.getByText('Data Operazione', { exact: true })).toBeVisible();
    await expect(wizard.getByText('Causale', { exact: true })).toBeVisible();
    await expect(wizard.getByText('Uscite = expenses · Entrate = income')).toBeVisible();
    await expect(wizard.getByRole('progressbar', { name: 'Import progress' }))
      .toHaveAttribute('aria-valuetext', 'Check preview, step 2 of 4');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_transactions') ?? '[]'))).toHaveLength(0);

    await wizard.getByRole('button', { name: 'Continue' }).click();
    await expect(wizard.getByText('Categorize and review')).toBeVisible();
    await expect(wizard.getByText('SUPERMERCATO', { exact: true })).toBeVisible();
    await expect(wizard.getByText('STIPENDIO', { exact: true })).toBeVisible();
    await expect(wizard.getByText('RISTORANTE', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_transactions') ?? '[]'))).toHaveLength(0);

    await wizard.getByRole('button', { name: 'Review 3 transactions' }).click();
    await wizard.getByRole('button', { name: 'Import with 3 Uncategorized' }).click();
    await expect(wizard.getByText('Import complete')).toBeVisible();

    const canonical = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('aura_transactions') ?? '[]')
        .map((transaction: { title: string; amount: number; type: string }) => ({
          title: transaction.title,
          amount: transaction.amount,
          type: transaction.type,
        }))
        .sort((left: { title: string }, right: { title: string }) => left.title.localeCompare(right.title)),
    );
    expect(canonical).toEqual([
      { title: 'RISTORANTE', amount: 31.5, type: 'expense' },
      { title: 'STIPENDIO', amount: 2100, type: 'income' },
      { title: 'SUPERMERCATO', amount: 43.2, type: 'expense' },
    ]);
  });
});
