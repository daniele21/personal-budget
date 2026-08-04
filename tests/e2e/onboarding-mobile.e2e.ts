import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

function seriousViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations.filter((violation) => (
    violation.impact === 'serious' || violation.impact === 'critical'
  ));
}

test.describe('Aura first-run mobile accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('completes setup without modal races or mobile overflow @mobile', async ({ page }) => {
    await page.goto('/');

    const startDialog = page.getByRole('dialog', { name: 'How would you like to start?' });
    await expect(startDialog).toBeVisible();
    await expect(startDialog.locator(':scope > div')).toHaveCSS('opacity', '1');
    expect(await page.locator('[aria-modal="true"]').count()).toBe(1);
    expect(seriousViolations(await new AxeBuilder({ page }).include('[role="dialog"]').analyze())).toEqual([]);

    await startDialog.getByRole('button', { name: 'Set up my budget' }).click();
    const setup = page.getByRole('dialog', { name: 'Set your monthly limit' });
    await expect(setup).toBeVisible();
    expect(await page.locator('[aria-modal="true"]').count()).toBe(1);

    await setup.getByRole('button', { name: 'Continue' }).click();
    await expect(setup.getByRole('alert')).toContainText('greater than zero');
    await setup.getByLabel('Monthly spending limit (€)').fill('1800');
    await setup.getByRole('button', { name: 'Continue' }).click();

    const categories = page.getByRole('dialog', { name: 'Review your categories' });
    await expect(categories.locator(':scope > div')).toHaveCSS('opacity', '1');
    await categories.getByLabel('Add another category').fill('Pets');
    await categories.getByRole('button', { name: 'Add category' }).click();
    await expect(categories.getByText('Pets')).toBeVisible();

    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
    expect(seriousViolations(await new AxeBuilder({ page }).include('[role="dialog"]').analyze())).toEqual([]);

    await categories.getByRole('button', { name: 'Finish setup' }).click();
    await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.localStorage.getItem('aura_monthly_budget'))).toBe('1800');
    expect(await page.evaluate(() => window.localStorage.getItem('aura_onboarding_complete'))).toBe('true');
    await expect(page.getByRole('dialog', { name: 'Guided Tour' })).toBeHidden();
  });
});
