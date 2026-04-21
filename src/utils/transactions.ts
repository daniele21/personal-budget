import { Transaction } from '../types';

/**
 * Returns transactions filtered to a specific month/year.
 * Defaults to the current month.
 */
export function getMonthlyTransactions(
  transactions: Transaction[],
  date: Date = new Date()
): Transaction[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/**
 * Calculate totals for a list of transactions.
 */
export function getTransactionTotals(transactions: Transaction[]) {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  return { income, expenses, net: income - expenses };
}

/**
 * Calculate month-over-month change percentage.
 * Compares current month net to previous month net.
 */
export function getMonthOverMonthChange(transactions: Transaction[]): number | null {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentTotals = getTransactionTotals(getMonthlyTransactions(transactions, now));
  const prevTotals = getTransactionTotals(getMonthlyTransactions(transactions, prevMonth));

  if (prevTotals.expenses === 0) return null;

  // Positive = spending less than last month (good), negative = spending more
  return ((prevTotals.expenses - currentTotals.expenses) / prevTotals.expenses) * 100;
}

/**
 * Sort transactions by date descending (most recent first).
 */
export function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Format a month label from a Date.
 */
export function formatMonthLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
