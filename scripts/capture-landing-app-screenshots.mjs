import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const outputDirectory = resolve(projectRoot, 'public/landing');
const baseUrl = process.env.AURA_CAPTURE_BASE_URL ?? 'http://127.0.0.1:4173';

const transaction = (id, amount, type, category, date, title, overrides = {}) => ({
  id,
  amount,
  type,
  category,
  date,
  title,
  description: title,
  paymentMethod: 'Bank account',
  reportingClass: 'regular',
  ...overrides,
});

const historicalMonths = [
  ['2025-09', 410, 170],
  ['2025-10', 465, 155],
  ['2025-11', 392, 190],
  ['2025-12', 540, 120],
  ['2026-01', 448, 165],
  ['2026-02', 386, 142],
  ['2026-03', 470, 176],
  ['2026-04', 428, 158],
  ['2026-05', 360, 134],
].flatMap(([month, groceries, transport], index) => [
  transaction(`income-history-${index}`, 3400, 'income', 'Income', `${month}-01T08:00:00.000Z`, 'Monthly salary'),
  transaction(`rent-history-${index}`, 950, 'expense', 'Home', `${month}-02T08:00:00.000Z`, 'Rent'),
  transaction(`groceries-history-${index}`, groceries, 'expense', 'Groceries', `${month}-12T08:00:00.000Z`, 'Groceries'),
  transaction(`transport-history-${index}`, transport, 'expense', 'Transport', `${month}-18T08:00:00.000Z`, 'Transport'),
  transaction(`subscriptions-history-${index}`, 72, 'expense', 'Subscriptions', `${month}-20T08:00:00.000Z`, 'Subscriptions'),
]);

const transactions = [
  transaction('income-aug', 3400, 'income', 'Income', '2026-08-01T08:00:00.000Z', 'Monthly salary'),
  transaction('rent-aug', 950, 'expense', 'Home', '2026-08-02T08:00:00.000Z', 'Rent'),
  transaction('groceries-aug-1', 142, 'expense', 'Groceries', '2026-08-03T08:00:00.000Z', 'Weekly groceries'),
  transaction('transport-aug', 86, 'expense', 'Transport', '2026-08-04T08:00:00.000Z', 'Monthly transport'),
  transaction('furniture-aug', 1200, 'expense', 'Home', '2026-08-04T12:00:00.000Z', 'Living room furniture', {
    reportingClass: 'extra',
    reportingNote: 'One-off home furniture',
  }),
  transaction('income-jul', 3400, 'income', 'Income', '2026-07-01T08:00:00.000Z', 'Monthly salary'),
  transaction('rent-jul', 950, 'expense', 'Home', '2026-07-02T08:00:00.000Z', 'Rent'),
  transaction('groceries-jul-1', 188, 'expense', 'Groceries', '2026-07-07T08:00:00.000Z', 'Weekly groceries'),
  transaction('groceries-jul-2', 166, 'expense', 'Groceries', '2026-07-17T08:00:00.000Z', 'Weekly groceries'),
  transaction('transport-jul', 174, 'expense', 'Transport', '2026-07-12T08:00:00.000Z', 'Transport'),
  transaction('subscriptions-jul', 72, 'expense', 'Subscriptions', '2026-07-20T08:00:00.000Z', 'Subscriptions'),
  transaction('income-jun', 3400, 'income', 'Income', '2026-06-01T08:00:00.000Z', 'Monthly salary'),
  transaction('rent-jun', 950, 'expense', 'Home', '2026-06-02T08:00:00.000Z', 'Rent'),
  transaction('groceries-jun', 438, 'expense', 'Groceries', '2026-06-14T08:00:00.000Z', 'Groceries'),
  transaction('transport-jun', 165, 'expense', 'Transport', '2026-06-19T08:00:00.000Z', 'Transport'),
  transaction('subscriptions-jun', 72, 'expense', 'Subscriptions', '2026-06-20T08:00:00.000Z', 'Subscriptions'),
  ...historicalMonths,
];

const storage = {
  aura_transactions: transactions,
  aura_budgets: [
    { category: 'Home', limit: 1100, spent: 0, currency: '€' },
    { category: 'Groceries', limit: 500, spent: 0, currency: '€' },
    { category: 'Transport', limit: 220, spent: 0, currency: '€' },
  ],
  aura_recurring: [],
  aura_accounts: [],
  aura_categories_list: ['Income', 'Home', 'Groceries', 'Transport', 'Subscriptions'],
  aura_archived_categories_list: [],
  aura_savings_goals: [],
  aura_monthly_budget: 3000,
  aura_dark_mode: false,
};

async function selectReportsLens(page, name) {
  await page.getByRole('button', { name: /View options,/ }).click();
  const dialog = page.getByRole('dialog', { name: 'View options' });
  await dialog.getByRole('button', { name }).click();
  await dialog.getByRole('button', { name: 'Close View options' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('[data-tour-id="reports-overview-summary"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(150);
}

async function capture(page, route, filename) {
  await page.goto(`${baseUrl}${route}`);
  await page.waitForLoadState('networkidle');
  const reportSelector = route.startsWith('/reports/categories/')
    ? '[aria-label^="Monthly spending trend for"]'
    : {
        '/reports': '[data-tour-id="reports-overview-summary"]',
        '/reports/categories': '[data-tour-id="reports-categories"]',
        '/reports/compare': '[data-tour-id="reports-compare"]',
        '/reports/year': '[data-tour-id="reports-year"]',
        '/budgets': '[data-tour-id="budget-summary"]',
      }[route];
  if (reportSelector) {
    await page.locator(reportSelector).waitFor({ state: 'visible' });
    await page.waitForTimeout(350);
  }
  if (route === '/payment-detection') {
    await page.getByRole('heading', { name: 'Payments to review', level: 2 }).waitFor();
    await page.getByText('Intesa Sanpaolo Mobile').first().waitFor();
  }
  await page.screenshot({ path: resolve(outputDirectory, filename), fullPage: false });
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'light',
});
const page = await context.newPage();
await page.addInitScript((seed) => {
  for (const [key, value] of Object.entries(seed)) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
  window.localStorage.setItem('aura_cloud_backup_enabled', 'false');
  window.localStorage.setItem('aura_onboarding_complete', 'true');
  window.localStorage.setItem('aura_initial_data_choice', 'blank');
  window.localStorage.setItem('aura_guided_tour_complete', 'true');
}, storage);

try {
  await capture(page, '/', 'aura-home.png');
  await page.getByRole('button', { name: 'Net of extras' }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: resolve(outputDirectory, 'aura-home-net.png'), fullPage: false });
  await capture(page, '/budgets', 'aura-budgets.png');
  await capture(page, '/reports', 'aura-reports-actual.png');
  await selectReportsLens(page, 'Net of extras');
  await page.screenshot({ path: resolve(outputDirectory, 'aura-reports-net.png'), fullPage: false });
  await selectReportsLens(page, 'Extras only');
  await page.screenshot({ path: resolve(outputDirectory, 'aura-reports-extras.png'), fullPage: false });
  await capture(page, '/reports/categories', 'aura-reports-categories.png');
  await capture(page, '/reports/categories/Home?range=12M&lens=actual', 'aura-reports-category-home.png');
  await capture(page, '/reports/categories/Groceries?range=12M&lens=actual', 'aura-reports-category-groceries.png');
  await capture(page, '/reports/compare', 'aura-reports-compare.png');
  await capture(page, '/reports/year', 'aura-reports-year.png');
  await capture(page, '/payment-detection', 'aura-payment-detection.png');
} finally {
  await browser.close();
}

console.log(`Captured authentic Aura UI screenshots in ${outputDirectory}`);
