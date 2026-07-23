import { Budget } from '../../types';
import { APP_CONFIG } from '../../constants';

/**
 * Builds per-category monthly budgets demonstrating different health states:
 * healthy spending, near-limit warnings, and over-budget alerts.
 */
export function buildDemoBudgets(): Budget[] {
  return [
    { category: 'Housing', limit: 1200, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Groceries', limit: 450, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Dining', limit: 200, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Transport', limit: 150, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Shopping', limit: 300, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Utilities', limit: 180, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Entertainment', limit: 150, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Health', limit: 100, spent: 0, currency: APP_CONFIG.currency },
  ];
}
