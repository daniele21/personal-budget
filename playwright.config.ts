import { defineConfig, devices } from '@playwright/test';

const fullMedia = process.env.AURA_E2E_FULL_MEDIA === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  globalTimeout: process.env.CI ? 20 * 60_000 : undefined,
  maxFailures: process.env.CI ? 3 : undefined,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: fullMedia ? 'on' : 'only-on-failure',
    video: fullMedia ? 'on' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--enable-precise-memory-info'] },
      },
    },
    {
      name: 'webkit',
      grep: /@cross-browser/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      grep: /@mobile/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-webkit',
      grep: /@mobile/,
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
