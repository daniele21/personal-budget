import {
  Account,
  Budget,
  RecurringExpense,
  SavingsGoal,
  Transaction,
} from '../types';
import {
  APP_CONFIG,
  INITIAL_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_CATEGORIES,
  INITIAL_RECURRING,
  INITIAL_SAVINGS_GOALS,
  INITIAL_TRANSACTIONS,
} from '../constants';
import { syncRecurringTransactions } from '../domain/finance';
import { normalizeRecurringExpenses } from '../domain/recurring';

export type {
  Account,
  Budget,
  RecurringExpense,
  SavingsGoal,
  Transaction,
};

export interface AppData {
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringExpense[];
  accounts: Account[];
  categories: string[];
  archivedCategories: string[];
  savingsGoals: SavingsGoal[];
  monthlyBudget: number;
}

export type AppDataInput = Partial<{
  transactions: unknown;
  budgets: unknown;
  recurring: unknown;
  accounts: unknown;
  categories: unknown;
  archivedCategories: unknown;
  savingsGoals: unknown;
  monthlyBudget: unknown;
}>;

export type BackupPayload = AppData;

export const INITIAL_APP_DATA: AppData = {
  transactions: INITIAL_TRANSACTIONS,
  budgets: INITIAL_BUDGETS,
  recurring: INITIAL_RECURRING,
  accounts: INITIAL_ACCOUNTS,
  categories: INITIAL_CATEGORIES,
  archivedCategories: [],
  savingsGoals: INITIAL_SAVINGS_GOALS,
  monthlyBudget: APP_CONFIG.defaultMonthlyBudget,
};

function arrayOrDefault<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? value as T[] : fallback;
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeAppData(input: AppDataInput = {}): AppData {
  const recurring = normalizeRecurringExpenses(
    arrayOrDefault<RecurringExpense>(input.recurring, INITIAL_APP_DATA.recurring),
  );
  const transactions = arrayOrDefault<Transaction>(input.transactions, INITIAL_APP_DATA.transactions);

  return {
    transactions: syncRecurringTransactions(recurring, transactions),
    budgets: arrayOrDefault<Budget>(input.budgets, INITIAL_APP_DATA.budgets),
    recurring,
    accounts: arrayOrDefault<Account>(input.accounts, INITIAL_APP_DATA.accounts),
    categories: arrayOrDefault<string>(input.categories, INITIAL_APP_DATA.categories),
    archivedCategories: arrayOrDefault<string>(input.archivedCategories, INITIAL_APP_DATA.archivedCategories),
    savingsGoals: arrayOrDefault<SavingsGoal>(input.savingsGoals, INITIAL_APP_DATA.savingsGoals),
    monthlyBudget: numberOrDefault(input.monthlyBudget, INITIAL_APP_DATA.monthlyBudget),
  };
}

export function syncAppData(data: AppData, today: Date = new Date()): AppData {
  const recurring = normalizeRecurringExpenses(data.recurring);
  return {
    ...data,
    recurring,
    transactions: syncRecurringTransactions(recurring, data.transactions, today),
  };
}

export function isFinancialDataEmpty(data: Pick<AppData, 'transactions' | 'budgets' | 'recurring'>): boolean {
  return data.transactions.length === 0 && data.budgets.length === 0 && data.recurring.length === 0;
}
