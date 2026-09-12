import { expect, test } from '@playwright/test';
import { seedImportWorkspace } from './support/transactionImport';

test.describe('Import V2 arbitrary spreadsheet journey', () => {
  test.beforeEach(async ({ page }) => {
    await seedImportWorkspace(page);
  });

  test('maps arbitrary headers manually and keeps verified Review as the only commit path', async ({ page }) => {
    const forbiddenImportRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url().toLowerCase();
      const body = request.postData() ?? '';
      if (
        url.includes('generativelanguage.googleapis.com')
        || url.includes('aiplatform.googleapis.com')
        || body.includes('Synthetic Grocery')
        || body.includes('Synthetic Salary')
      ) forbiddenImportRequests.push(request.url());
    });

    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    await expect(wizard).toBeVisible();

    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'localized-bank.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([
        'Booking Date,Details,Amount',
        '2026-09-01,Synthetic Grocery,-42.00',
        '2026-09-02,Synthetic Salary,2200.00',
      ].join('\n')),
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();

    await expect(wizard.getByText('Check the columns Aura should use')).toBeVisible();
    await expect(wizard.getByRole('button', { name: 'Confirm mapping' })).toBeDisabled();
    await wizard.getByLabel('Transaction date').selectOption({ index: 1 });
    await wizard.getByLabel('Amount').selectOption({ index: 1 });
    await wizard.getByRole('checkbox', { name: /Details/ }).check();
    await wizard.getByRole('button', { name: 'Confirm mapping' }).click();

    await expect(wizard.getByText('Categorize and review')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('aura_transactions'))).toBe('[]');
    await wizard.getByRole('button', { name: 'Review 2 transactions' }).click();
    await expect(wizard.getByText(/2 included transactions are still Uncategorized/)).toBeVisible();
    await wizard.getByRole('button', { name: 'Import with 2 Uncategorized' }).click();
    await expect(wizard.getByText('Import complete')).toBeVisible();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('aura_transactions') ?? '[]'));
    expect(stored).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Synthetic Grocery', amount: 42, type: 'expense' }),
      expect.objectContaining({ title: 'Synthetic Salary', amount: 2200, type: 'income' }),
    ]));
    expect(forbiddenImportRequests).toEqual([]);
  });
});
