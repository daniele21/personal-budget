/**
 * Centralized storage key registry.
 * All localStorage keys are defined here to avoid magic strings
 * and enable type-safe access.
 */
export const STORAGE_KEYS = {
  transactions: 'aura_transactions',
  budgets: 'aura_budgets',
  recurring: 'aura_recurring',
  recurringGenerated: 'aura_recurring_generated',
  categories: 'aura_categories_list',
  accounts: 'aura_accounts',
  monthlyBudget: 'aura_monthly_budget',
  user: 'aura_user',
  loggedIn: 'aura_logged_in',
  darkMode: 'aura_dark_mode',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
