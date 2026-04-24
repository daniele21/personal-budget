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
  archivedCategories: 'aura_archived_categories_list',
  accounts: 'aura_accounts',
  savingsGoals: 'aura_savings_goals',
  monthlyBudget: 'aura_monthly_budget',
  user: 'aura_user',
  loggedIn: 'aura_logged_in',
  darkMode: 'aura_dark_mode',
  cloudBackupEnabled: 'aura_cloud_backup_enabled',
  onboardingComplete: 'aura_onboarding_complete',
  allowedUsersCache: 'aura_allowed_users_cache',
  allowedUsersCacheTs: 'aura_allowed_users_cache_ts',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
