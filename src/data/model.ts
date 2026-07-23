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

/**
 * Project an AppData-compatible object onto the canonical persisted shape.
 *
 * TypeScript structural typing allows richer objects such as AppDataState to be
 * passed where AppData is expected. This explicit projection prevents UI or
 * workflow metadata from crossing persistence, archive, and backup boundaries.
 */
export function projectAppData(data: AppData): AppData {
  return {
    transactions: data.transactions.map(migrateLegacyDemoAttachmentReference),
    budgets: data.budgets,
    recurring: data.recurring,
    accounts: data.accounts,
    categories: data.categories,
    archivedCategories: data.archivedCategories,
    savingsGoals: data.savingsGoals,
    monthlyBudget: data.monthlyBudget,
  };
}

function migrateLegacyDemoAttachmentReference(transaction: Transaction): Transaction {
  if (!transaction.attachmentUrl?.startsWith('https://images.unsplash.com/')) {
    return transaction;
  }
  return {
    ...transaction,
    attachmentUrl: undefined,
  };
}

function arrayOrDefault<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? value as T[] : fallback;
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeTransaction(transaction: Transaction): Transaction {
  const migratedTransaction = migrateLegacyDemoAttachmentReference(transaction);
  const reportingClass = migratedTransaction.sourceRecurringId
    ? undefined
    : migratedTransaction.reportingClass === 'extra'
      ? 'extra'
      : migratedTransaction.type === 'income' && migratedTransaction.reportingClass === 'reimbursement'
        ? 'reimbursement'
      : undefined;
  const reportingNote = reportingClass && typeof migratedTransaction.reportingNote === 'string'
    ? migratedTransaction.reportingNote.trim()
    : '';

  return {
    ...migratedTransaction,
    reportingClass,
    reportingNote: reportingNote || undefined,
  };
}

function normalizeAccount(value: unknown): Account | null {
  if (!value || typeof value !== 'object') return null;
  const account = value as Partial<Account> & { balance?: unknown };
  const { balance: legacyBalance, ...accountWithoutLegacyBalance } = account;
  const openingBalance = numberOrDefault(
    account.openingBalance,
    numberOrDefault(legacyBalance, 0),
  );

  return {
    ...(accountWithoutLegacyBalance as Account),
    openingBalance,
  };
}

export function normalizeAppData(input: AppDataInput = {}): AppData {
  const recurring = normalizeRecurringExpenses(
    arrayOrDefault<RecurringExpense>(input.recurring, INITIAL_APP_DATA.recurring),
  );
  const transactions = arrayOrDefault<Transaction>(input.transactions, INITIAL_APP_DATA.transactions).map(normalizeTransaction);

  return {
    transactions: syncRecurringTransactions(recurring, transactions).map(normalizeTransaction),
    budgets: arrayOrDefault<Budget>(input.budgets, INITIAL_APP_DATA.budgets),
    recurring,
    accounts: arrayOrDefault<unknown>(input.accounts, INITIAL_APP_DATA.accounts)
      .map(normalizeAccount)
      .filter((account): account is Account => account !== null),
    categories: arrayOrDefault<string>(input.categories, INITIAL_APP_DATA.categories),
    archivedCategories: arrayOrDefault<string>(input.archivedCategories, INITIAL_APP_DATA.archivedCategories),
    savingsGoals: arrayOrDefault<SavingsGoal>(input.savingsGoals, INITIAL_APP_DATA.savingsGoals),
    monthlyBudget: numberOrDefault(input.monthlyBudget, INITIAL_APP_DATA.monthlyBudget),
  };
}

export function syncAppData(data: AppData, today: Date = new Date()): AppData {
  const canonical = projectAppData(data);
  const recurring = normalizeRecurringExpenses(data.recurring);
  return {
    ...canonical,
    recurring,
    transactions: syncRecurringTransactions(recurring, canonical.transactions, today).map(normalizeTransaction),
  };
}

export function isFinancialDataEmpty(data: Pick<AppData, 'transactions' | 'budgets' | 'recurring'>): boolean {
  return data.transactions.length === 0 && data.budgets.length === 0 && data.recurring.length === 0;
}
