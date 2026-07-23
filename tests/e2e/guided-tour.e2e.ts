import { expect, test } from '@playwright/test';
import { seedPortableWorkspace } from './support/portableArchive';
import { TOUR_STEPS } from '../../src/config/tourSteps';

test.describe('Aura Guided Tour E2E', () => {
  test.beforeEach(async ({ page }) => {
    await seedPortableWorkspace(page);
    // Clear guided tour complete flag so tour auto-starts on first access
    await page.evaluate(() => {
      window.localStorage.removeItem('aura_guided_tour_complete');
    });
  });

  test('auto-starts on first access and navigates across pages step by step', async ({ page }) => {
    await page.goto('/');

    const tourDialog = page.getByRole('dialog', { name: 'Guided Tour' });
    await expect(tourDialog).toBeVisible({ timeout: 5000 });

    for (const [index, step] of TOUR_STEPS.entries()) {
      await expect.poll(() => new URL(page.url()).pathname).toBe(step.route);
      await expect(tourDialog.getByRole('heading', { name: step.title })).toBeVisible();
      await expect(tourDialog).toHaveAttribute('data-tour-target-ready', 'true');
      await expect(page.locator(step.target)).toBeVisible();
      const expectsPersistentNavigation =
        step.id !== 'primary-navigation' && !step.route.startsWith('/planning');

      if (expectsPersistentNavigation) {
        await expect(tourDialog.locator('[data-tour-navigation-highlight="true"]').first()).toBeVisible();
      }

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
        const nextStep = TOUR_STEPS[index + 1];
        await tourDialog.getByRole('button', { name: 'Next' }).click();
        if (nextStep.route !== step.route) {
          await expect(tourDialog).toHaveAttribute('data-tour-transition', 'true');
          await expect(tourDialog.locator('[data-tour-navigation-highlight="true"]').first()).toBeVisible();
        }
      }
    }

    await tourDialog.getByRole('button', { name: 'Done' }).click();
    await expect(tourDialog).not.toBeVisible();

    // Verify localStorage has guidedTourComplete set to true
    const isComplete = await page.evaluate(() => window.localStorage.getItem('aura_guided_tour_complete'));
    expect(isComplete).toBe('true');
  });

  test('can be manually triggered from the More page and skipped', async ({ page }) => {
    // Mark tour complete initially
    await page.evaluate(() => {
      window.localStorage.setItem('aura_guided_tour_complete', 'true');
    });

    await page.goto('/more');

    // Click "Guided Tour" button on More page
    await page.getByRole('button', { name: 'Guided Tour' }).click();

    // Tour overlay should open at Step 1
    const tourDialog = page.getByRole('dialog', { name: 'Guided Tour' });
    await expect(tourDialog).toBeVisible();
    await expect(tourDialog.getByRole('heading', { name: 'Period and spending view' })).toBeVisible();

    // Click "Skip tour"
    await tourDialog.getByRole('button', { name: 'Skip tour' }).first().click();
    await expect(tourDialog).not.toBeVisible();
  });
});
