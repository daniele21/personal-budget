import { APP_CONFIG, INITIAL_CATEGORIES } from '../constants';
import type { AppData } from './model';
import { buildDemoAccounts } from './demo/accountsDemo';
import { buildDemoBudgets } from './demo/budgetsDemo';
import { buildDemoGoals } from './demo/goalsDemo';
import { buildDemoRecurring } from './demo/recurringDemo';
import { buildDemoTransactions } from './demo/transactionsDemo';

export type DemoDataSet = AppData;

/**
 * Builds a comprehensive, realistic 12-month demo dataset centered around the runtime date.
 * Populates all dashboard, budgeting, recurring, calendar, comparison, insight, and annual review
 * surfaces with rich, feature-showcasing data.
 */
export function buildDemoData(now = new Date()): DemoDataSet {
  const year = now.getFullYear();
  const month = now.getMonth();

  const transactions = buildDemoTransactions(now);
  const budgets = buildDemoBudgets();
  const recurring = buildDemoRecurring(year, month);
  const accounts = buildDemoAccounts();
  const savingsGoals = buildDemoGoals(year, month);

  const categories = Array.from(
    new Set([
      ...INITIAL_CATEGORIES,
      'Travel',
      'Education',
      'Subscriptions',
      'Investments',
      'Freelance',
    ]),
  );

  return {
    transactions,
    budgets,
    recurring,
    accounts,
    categories,
    archivedCategories: [],
    savingsGoals,
    monthlyBudget: APP_CONFIG.demoMonthlyBudget,
  };
}
