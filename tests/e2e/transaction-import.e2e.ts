import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { seedImportWorkspace, syntheticTransaction } from './support/transactionImport';

test.describe('deterministic transaction import M4', () => {
  test.beforeEach(async ({ page }) => {
    await seedImportWorkspace(page);
  });

  test('imports, verifies after reload, filters Uncategorized, and batch-corrects it', async ({ page }) => {
    const forbiddenImportRequests: string[] = [];
    const unexpectedExternalRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url().toLowerCase();
      const body = request.postData() ?? '';
      const parsedUrl = new URL(request.url());
      const isKnownApplicationDependency = (
        ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(parsedUrl.hostname)
        || (
          parsedUrl.hostname === 'firestore.googleapis.com'
          && parsedUrl.pathname.endsWith('/google.firestore.v1.Firestore/Listen/channel')
        )
      );
      if (!['127.0.0.1', 'localhost'].includes(parsedUrl.hostname) && !isKnownApplicationDependency) {
        unexpectedExternalRequests.push(`${request.method()} ${parsedUrl.origin}${parsedUrl.pathname}`);
      }
      if (
        url.includes('generativelanguage.googleapis.com')
        || url.includes('aiplatform.googleapis.com')
        || body.includes('Local market')
        || body.includes('Taxi')
      ) forbiddenImportRequests.push(request.url());
    });
    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    await expect(wizard).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await wizard.getByRole('button', { name: 'CSV template' }).click();
    const template = await downloadPromise;
    expect(template.suggestedFilename()).toBe('aura_transaction_import_template.csv');

    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'transactions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([
        'date,description,amount',
        '2026-08-01,Local market,-25.99',
        '2026-08-02,Local market,-12.50',
        '2026-08-03,Taxi,-18.00',
      ].join('\n')),
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await expect(wizard.getByText('Categorize and review')).toBeVisible();

    await wizard.getByRole('button', { name: 'Set category' }).first().click();
    await wizard.getByRole('button', { name: /Category: not selected/ }).click();
    const picker = page.getByRole('dialog', { name: 'Category' });
    await picker.getByRole('option', { name: 'Food' }).click();
    await wizard.getByRole('button', { name: 'Same description (2)' }).click();
    await expect(wizard.getByText('1', { exact: true }).first()).toBeVisible();

    await wizard.getByRole('button', { name: 'Review 3 transactions' }).click();
    await wizard.getByRole('button', { name: 'Import with 1 Uncategorized' }).click();
    await expect(wizard.getByText('Import complete')).toBeVisible();
    await wizard.getByRole('button', { name: 'Review Uncategorized in history' }).click();

    await expect(page.getByText('Taxi', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_transactions') ?? '[]').length)).toBe(3);

    await page.reload();
    await expect(page.getByText('Taxi', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await page.getByRole('button', { name: 'Select visible' }).click();
    await page.getByLabel('Batch category').selectOption('Travel');
    await page.getByRole('button', { name: 'Change category' }).click();
    await expect(page.getByText('Taxi', { exact: true })).toBeHidden();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('aura_transactions') ?? '[]'));
    expect(stored).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Taxi', category: 'Travel', amount: 18 }),
      expect.objectContaining({ title: 'Local market', category: 'Food' }),
    ]));
    expect(forbiddenImportRequests).toEqual([]);
    expect(unexpectedExternalRequests).toEqual([]);
  });

  test('keeps invalid headers out of review and does not change the ledger', async ({ page }) => {
    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('description,amount\nCoffee,-2.50'),
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();

    await expect(wizard.getByRole('alert', { name: 'File validation results' })).toContainText(
      'The header must contain exactly three columns.',
    );
    await expect(wizard.getByText('Categorize and review')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('aura_transactions'))).toBe('[]');
  });

  test('reports invalid rows and oversized files without changing the ledger', async ({ page }) => {
    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    const invalidRows = await readFile(resolve('tests/fixtures/import/invalid-rows.csv'));
    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'invalid-rows.csv', mimeType: 'text/csv', buffer: invalidRows,
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await expect(wizard.getByRole('alert', { name: 'File validation results' })).toContainText('Use a real calendar date.');

    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'oversized.csv',
      mimeType: 'text/csv',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await expect(wizard.getByRole('alert', { name: 'File validation results' })).toContainText('exceeds the supported size limit');
    expect(await page.evaluate(() => localStorage.getItem('aura_transactions'))).toBe('[]');
  });

  test('shows duplicate warnings, supports exclusion, and discards review on close/reopen', async ({ page }) => {
    const existing = syntheticTransaction('existing', {
      amount: 25.99,
      date: '2026-08-01T00:00:00.000Z',
      title: 'Local market',
      description: 'Local market',
    });
    await page.goto('/');
    await page.evaluate((transaction) => {
      localStorage.setItem('aura_transactions', JSON.stringify([transaction]));
    }, existing);
    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'duplicate.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,description,amount\n2026-08-01,Local market,-25.99'),
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await expect(wizard.getByText('Possible duplicate', { exact: true })).toBeVisible();
    await wizard.getByRole('button', { name: 'Exclude all possible duplicates' }).click();
    await expect(wizard.getByRole('button', { name: 'Review 0 transactions' })).toBeDisabled();

    await wizard.getByRole('button', { name: 'Close import wizard' }).click();
    const discard = page.getByRole('dialog', { name: 'Discard import review?' });
    await discard.getByRole('button', { name: 'Discard review' }).click();
    await expect(wizard).toBeHidden();
    await page.reload();
    await expect(page.getByRole('dialog', { name: 'Import transactions' }).getByText('Drop a file here')).toBeVisible();
  });

  test('keeps the review after an injected persistence failure', async ({ page }) => {
    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'single.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('date,description,amount\n2026-08-01,Synthetic failure,-10.00'),
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await wizard.getByRole('button', { name: 'Review 1 transactions' }).click();
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      let injected = false;
      Storage.prototype.setItem = function setItem(key: string, value: string) {
        if (!injected && key === 'aura_transactions') {
          injected = true;
          throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      };
    });
    await wizard.getByRole('button', { name: 'Import with 1 Uncategorized' }).click();
    await expect(wizard.getByRole('alert')).toContainText('review is still available');
    await expect(wizard.getByRole('button', { name: 'Import with 1 Uncategorized' })).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem('aura_transactions'))).toBe('[]');
  });

  test('keeps renamed Aura archives isolated and supports Aura legacy CSV', async ({ page }) => {
    await page.goto('/history?import=1');
    let wizard = page.getByRole('dialog', { name: 'Import transactions' });
    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'renamed.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('AURAARC1synthetic-not-a-spreadsheet'),
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await expect(wizard.getByRole('alert')).toContainText('Complete Aura archive detected');
    expect(await page.evaluate(() => localStorage.getItem('aura_transactions'))).toBe('[]');

    const legacy = await readFile(resolve('tests/fixtures/import/aura-legacy.csv'));
    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'aura-legacy.csv', mimeType: 'text/csv', buffer: legacy,
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await expect(wizard.getByText('Import complete')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_transactions') ?? '[]'))).toEqual([
      expect.objectContaining({ id: 'fixture-aura-1', category: 'Groceries', amount: 12.5 }),
    ]);
  });

  test('exports existing transaction CSV with formula-safe string fields', async ({ page }) => {
    const unsafe = syntheticTransaction('safe-export', {
      title: '=SUM(1,1)',
      description: '@HYPERLINK("https://invalid.example")',
    });
    await page.goto('/');
    await page.evaluate((transaction) => {
      localStorage.setItem('aura_transactions', JSON.stringify([transaction]));
    }, unsafe);
    await page.goto('/data');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export transactions CSV' }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const csv = Buffer.concat(chunks).toString('utf8');
    expect(csv).toContain("'=SUM(1,1)");
    expect(csv).toContain("'@HYPERLINK");
  });
});
