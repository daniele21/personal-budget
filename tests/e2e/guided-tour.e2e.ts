import { expect, test } from '@playwright/test';
import { seedPortableWorkspace } from './support/portableArchive';
import { TOUR_STEPS } from '../../src/config/tourSteps';

test.describe('Aura Guided Tour E2E', () => {
  test.beforeEach(async ({ page }) => {
    await seedPortableWorkspace(page);
    await page.evaluate(() => {
      window.localStorage.removeItem('aura_tour_state_v1:home');
    });
  });

  test('does not auto-start and runs one short single-route tour on request', async ({ page }) => {
    await page.goto('/more');

    const tourDialog = page.getByRole('dialog', { name: 'Guided Tour' });
    await expect(tourDialog).toBeHidden();
    await page.getByRole('button', { name: /Help & tours/i }).click();
    await page.getByRole('button', { name: 'Start Home essentials tour' }).click();
    await expect(tourDialog).toBeVisible();

    for (const [index, step] of TOUR_STEPS.entries()) {
      await expect.poll(() => new URL(page.url()).pathname).toBe(step.route);
      await expect(tourDialog.getByRole('heading', { name: step.title })).toBeVisible();
      await expect(tourDialog).toHaveAttribute('data-tour-target-ready', 'true');
      await expect(page.locator(step.target)).toBeVisible();
      const panel = tourDialog.locator('[data-tour-placement]');
      const spotlight = tourDialog.locator('[data-tour-spotlight="true"]');
      const [panelBox, spotlightBox] = await Promise.all([
        panel.boundingBox(),
        spotlight.boundingBox(),
      ]);
      expect(panelBox).not.toBeNull();
      expect(spotlightBox).not.toBeNull();
      if (panelBox && spotlightBox) {
        const overlapsSpotlight = !(
          panelBox.y + panelBox.height <= spotlightBox.y ||
          spotlightBox.y + spotlightBox.height <= panelBox.y
        );
        expect(overlapsSpotlight, `Step ${index + 1} panel obscures its spotlight`).toBe(false);
      }

      if (index < TOUR_STEPS.length - 1) {
        await tourDialog.getByRole('button', { name: 'Next' }).click();
      }
    }

    await tourDialog.getByRole('button', { name: 'Done' }).click();
    await expect(tourDialog).not.toBeVisible();

    const state = await page.evaluate(() => window.localStorage.getItem('aura_tour_state_v1:home'));
    expect(state).toBe('completed');
  });

  test('can be manually triggered from the More page and skipped', async ({ page }) => {
    await page.goto('/more');

    await page.getByRole('button', { name: /Help & tours/i }).click();
    await page.getByRole('button', { name: 'Start Home essentials tour' }).click();

    // Tour overlay should open at Step 1
    const tourDialog = page.getByRole('dialog', { name: 'Guided Tour' });
    await expect(tourDialog).toBeVisible();
    await expect(tourDialog.getByRole('heading', { name: 'Period and spending view' })).toBeVisible();

    // Click "Skip tour"
    await tourDialog.getByRole('button', { name: 'Skip tour' }).first().click();
    await expect(tourDialog).not.toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem('aura_tour_state_v1:home'))).toBe('dismissed');
  });
});
