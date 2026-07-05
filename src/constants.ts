import { Transaction, Budget, Account, RecurringExpense, SavingsGoal } from './types';

export const APP_CONFIG = {
  name: 'Aura',
  tagline: 'Clarity today. Confidence tomorrow.',
  description: 'Your private budget companion, built around your data.',
  currency: '€',
  defaultMonthlyBudget: 5000,
};

export const INITIAL_ACCOUNTS: Account[] = [];

export const INITIAL_CATEGORIES = [
  'Housing',
  'Groceries',
  'Dining',
  'Transport',
  'Entertainment',
  'Health',
  'Salary',
  'Utilities',
  'Shopping'
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_BUDGETS: Budget[] = [];

export const INITIAL_RECURRING: RecurringExpense[] = [];

export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [];
