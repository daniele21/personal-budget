import type { Page } from '@playwright/test';
import type { Transaction } from '../../../src/types';

export async function seedImportWorkspace(
  page: Page,
  transactions: Transaction[] = [],
  darkMode = false,
) {
  await page.addInitScript(({ seededTransactions, seededDarkMode }) => {
    if (window.sessionStorage.getItem('aura_import_e2e_seeded') === 'true') return;
    const values: Record<string, unknown> = {
      aura_transactions: seededTransactions,
      aura_budgets: [],
      aura_recurring: [],
      aura_accounts: [],
      aura_categories_list: ['Food', 'Travel', 'Groceries', 'Uncategorized'],
      aura_archived_categories_list: [],
      aura_savings_goals: [],
      aura_monthly_budget: 0,
      aura_dark_mode: seededDarkMode,
    };
    for (const [key, value] of Object.entries(values)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
    window.localStorage.setItem('aura_cloud_backup_enabled', 'false');
    window.localStorage.setItem('aura_onboarding_complete', 'true');
    window.localStorage.setItem('aura_initial_data_choice', 'blank');
    window.localStorage.setItem('aura_guided_tour_complete', 'true');
    window.sessionStorage.setItem('aura_import_e2e_seeded', 'true');
  }, { seededTransactions: transactions, seededDarkMode: darkMode });
}

export function syntheticTransaction(
  id: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    amount: 10,
    type: 'expense',
    category: 'Food',
    date: '2026-08-01T00:00:00.000Z',
    title: `Synthetic ${id}`,
    description: `Synthetic ${id}`,
    paymentMethod: 'Bank Transfer',
    ...overrides,
  };
}
