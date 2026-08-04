import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';
import { seedImportWorkspace } from './support/transactionImport';

function seriousViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target),
    }));
}

test.describe('deterministic transaction import M6 quality', () => {
  test.beforeEach(async ({ page }) => {
    await seedImportWorkspace(page);
  });

  test('imports a generated XLSX locally @cross-browser', async ({ page }) => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Transactions').addRows([
      ['date', 'description', 'amount'],
      ['2026-08-01', 'Synthetic XLSX expense', -14.25],
      ['2026-08-02', 'Synthetic XLSX income', 200],
    ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'transactions.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await expect(wizard.getByText('Categorize and review')).toBeVisible();
    await wizard.getByRole('button', { name: 'Review 2 transactions' }).click();
    await wizard.getByRole('button', { name: 'Import with 2 Uncategorized' }).click();
    await expect(wizard.getByText('Import complete')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aura_transactions') ?? '[]'))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Synthetic XLSX expense', amount: 14.25, type: 'expense' }),
        expect.objectContaining({ title: 'Synthetic XLSX income', amount: 200, type: 'income' }),
      ]),
    );
  });

  test('keeps the wizard accessible, theme-safe, keyboard-contained, and free of horizontal overflow @cross-browser @mobile', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [320, 360, 390, 430]) {
      await page.setViewportSize({ width, height: 760 });
      await page.goto('/history?import=1');
      const wizard = page.getByRole('dialog', { name: 'Import transactions' });
      await expect(wizard).toBeVisible();
      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
      const dialogGeometry = await wizard.evaluate((element) => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }));
      expect(dialogGeometry.scrollWidth).toBeLessThanOrEqual(dialogGeometry.clientWidth + 1);
    }

    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    await wizard.evaluate((element) => {
      const focusable = element.querySelectorAll<HTMLElement>([
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(','));
      focusable.item(focusable.length - 1)?.focus();
    });
    await page.keyboard.press('Tab');
    await expect(wizard.locator(':focus')).toHaveCount(1);
    await expect(wizard).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

    const lightResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(seriousViolations(lightResults)).toEqual([]);

    await page.evaluate(() => localStorage.setItem('aura_dark_mode', 'true'));
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    const darkWizard = page.getByRole('dialog', { name: 'Import transactions' });
    await expect(darkWizard).toBeVisible();
    await expect(darkWizard).toHaveCSS('opacity', '1');
    const darkResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(seriousViolations(darkResults)).toEqual([]);
  });

  test('validates the 20,000-row boundary with bounded DOM rendering @mobile', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const rows = Array.from(
      { length: 20_000 },
      (_, index) => `2026-08-01,Synthetic boundary ${index},-1.00`,
    );
    const csv = ['date,description,amount', ...rows].join('\n');
    await page.goto('/history?import=1');
    const wizard = page.getByRole('dialog', { name: 'Import transactions' });
    const heapBefore = await page.evaluate(() => {
      const memory = performance as Performance & { memory?: { usedJSHeapSize: number } };
      return memory.memory?.usedJSHeapSize ?? null;
    });
    const startedAt = Date.now();
    await wizard.getByLabel('Choose transaction file').setInputFiles({
      name: 'boundary.csv', mimeType: 'text/csv', buffer: Buffer.from(csv),
    });
    await wizard.getByRole('button', { name: 'Validate file' }).click();
    await expect(wizard.getByText('Categorize and review')).toBeVisible({ timeout: 90_000 });
    const durationMs = Date.now() - startedAt;
    expect(durationMs).toBeLessThan(90_000);
    await expect(wizard.locator('article')).toHaveCount(100);
    await expect(wizard.getByText('Page 1 of 200')).toBeVisible();

    const heapAfter = await page.evaluate(() => {
      const memory = performance as Performance & { memory?: { usedJSHeapSize: number } };
      return memory.memory?.usedJSHeapSize ?? null;
    });
    const heapDeltaMiB = heapBefore !== null && heapAfter !== null
      ? (heapAfter - heapBefore) / (1024 * 1024)
      : null;
    testInfo.annotations.push({
      type: 'performance',
      description: `20k rows: ${durationMs}ms${heapDeltaMiB === null ? '' : `, heap delta ${heapDeltaMiB.toFixed(1)} MiB`}`,
    });
    if (heapDeltaMiB !== null) expect(heapDeltaMiB).toBeLessThan(256);
  });

  test('downloads the CSV template through the bundled runtime', async ({ page }) => {
    await page.goto('/history?import=1');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('dialog', { name: 'Import transactions' })
      .getByRole('button', { name: 'CSV template' })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('aura_transaction_import_template.csv');
  });
});
