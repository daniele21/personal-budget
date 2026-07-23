import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  exportEncryptedArchive,
  seedPortableWorkspace,
} from './support/portableArchive';

const SUPPORTED_WIDTHS = [320, 360, 390, 430];

async function waitForVisualStability(page: import('@playwright/test').Page) {
  await expect(page.getByTestId('data-privacy-page')).toHaveCSS('opacity', '1');
}

function seriousViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target),
    }));
}

test.describe('Aura M7 browser quality', () => {
  test.beforeEach(async ({ page }) => {
    await seedPortableWorkspace(page);
  });

  test('keeps archive controls reachable at supported narrow widths @cross-browser @mobile', async ({ page }) => {
    for (const width of SUPPORTED_WIDTHS) {
      await test.step(`${width}px`, async () => {
        await page.setViewportSize({ width, height: 760 });
        await page.goto('/data');

        const pageGeometry = await page.evaluate(() => ({
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
        }));
        expect(pageGeometry.documentWidth).toBeLessThanOrEqual(pageGeometry.viewportWidth);

        await page.getByRole('button', { name: 'Export complete archive' }).click();
        const dialog = page.getByRole('dialog', { name: 'Export complete Aura archive' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByLabel('Passphrase', { exact: true })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Create and download archive' })).toBeVisible();
        const close = dialog.getByRole('button', { name: 'Close' });
        await expect(close).toBeVisible();

        const dialogGeometry = await dialog.evaluate((element) => ({
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
        }));
        expect(dialogGeometry.scrollWidth).toBeLessThanOrEqual(dialogGeometry.clientWidth + 1);
        expect(dialogGeometry.scrollHeight).toBeGreaterThanOrEqual(dialogGeometry.clientHeight);
        await close.click();
      });
    }
  });

  test('has no serious WCAG A/AA violations in light and dark archive surfaces @cross-browser', async ({ page }) => {
    // Avoid sampling colors while the route-level opacity transition is midway.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/data');
    await waitForVisualStability(page);
    const lightResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(seriousViolations(lightResults)).toEqual([]);

    await page.goto('/more');
    await page.getByRole('switch', { name: 'Toggle dark mode' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.goto('/data');
    await page.getByRole('button', { name: 'Export complete archive' }).click();
    const dialog = page.getByRole('dialog', { name: 'Export complete Aura archive' });
    await expect(dialog).toBeVisible();
    await waitForVisualStability(page);

    const darkResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(seriousViolations(darkResults)).toEqual([]);
  });

  test('traps and restores keyboard focus while respecting reduced motion @cross-browser', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/data');
    const opener = page.getByRole('button', { name: 'Export complete archive' });
    await opener.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Export complete Aura archive' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  });

  test('registers the production service-worker shell and exposes an installable manifest @pwa', async ({ page }) => {
    await page.goto('/');
    const manifest = await page.evaluate(async () => {
      const response = await fetch('/manifest.json');
      const body = await response.json() as {
        id: string;
        name: string;
        display: string;
        scope: string;
        start_url: string;
        icons: Array<{ sizes: string }>;
      };
      return {
        ...body,
        resolvedStartUrl: new URL(body.start_url, response.url).pathname,
      };
    });

    expect(manifest.name).toBeTruthy();
    expect(manifest.id).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.scope).toBe('/');
    expect(manifest.resolvedStartUrl).toBe('/');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );

    const registration = await page.evaluate(async () => {
      const ready = await navigator.serviceWorker.ready;
      return {
        scope: ready.scope,
        active: Boolean(ready.active),
      };
    });
    expect(registration.active).toBe(true);
    expect(registration.scope).toBe('http://127.0.0.1:4173/');
  });

  test('records bounded typical-workspace export resource evidence', async ({ page }, testInfo) => {
    const before = await page.evaluate(() => ({
      time: performance.now(),
      heap: 'memory' in performance
        ? (performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
        : null,
    }));
    const archive = await exportEncryptedArchive(page);
    const after = await page.evaluate(() => ({
      time: performance.now(),
      heap: 'memory' in performance
        ? (performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize
        : null,
    }));
    const evidence = {
      durationMs: Math.round(after.time - before.time),
      archiveBytes: archive.buffer.byteLength,
      heapBeforeBytes: before.heap,
      heapAfterBytes: after.heap,
      heapDeltaBytes: before.heap !== null && after.heap !== null ? after.heap - before.heap : null,
    };

    await testInfo.attach('typical-workspace-resource-evidence.json', {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: 'application/json',
    });
    expect(evidence.durationMs).toBeLessThan(45_000);
    expect(evidence.archiveBytes).toBeGreaterThan(1_000);
    if (evidence.heapAfterBytes !== null) {
      expect(evidence.heapAfterBytes).toBeLessThan(256 * 1024 * 1024);
    }
  });
});
