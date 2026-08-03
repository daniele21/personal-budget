import type { Transaction } from '../types';
import {
  type AnalyticsLens,
  filterByAnalyticsLens,
  filterByDateRange,
  getTransactionReportingClass,
} from './finance';

interface ExpenseAccumulator {
  grossExpenses: number;
  reimbursements: number;
}

export interface CalendarMonthWindow {
  key: string;
  label: string;
  start: Date;
  end: Date;
  scopedStart: Date;
  scopedEnd: Date;
  isComplete: boolean;
}

export interface CategoryMonthPoint {
  key: string;
  label: string;
  amount: number;
  isPartial: boolean;
}

export interface CategorySpendingSummary {
  category: string;
  selectedTotal: number;
  percentage: number;
  monthlyAverage: number | null;
  completeMonthCount: number;
}

export interface CategoryReport extends CategorySpendingSummary {
  monthlyPoints: CategoryMonthPoint[];
  topTransactions: Transaction[];
}

export interface SpendingPacePoint {
  key: string;
  label: string;
  actual: number;
  pace: number;
  baselineMonthCount: number;
}

export interface SpendingPaceReport {
  points: SpendingPacePoint[];
  monthlyPace: number | null;
  weeklyEquivalent: number | null;
  dailyEquivalent: number | null;
  baselineMonthCount: number;
}

function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function offsetLocalMonth(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1, 0, 0, 0, 0);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function emptyAccumulator(): ExpenseAccumulator {
  return { grossExpenses: 0, reimbursements: 0 };
}

function addTransaction(accumulator: ExpenseAccumulator, transaction: Transaction): void {
  if (transaction.type === 'expense') {
    accumulator.grossExpenses += transaction.amount;
  } else if (getTransactionReportingClass(transaction) === 'reimbursement') {
    accumulator.reimbursements += transaction.amount;
  }
}

function expenseAmount(accumulator?: ExpenseAccumulator): number {
  if (!accumulator) return 0;
  return Math.max(0, accumulator.grossExpenses - accumulator.reimbursements);
}

function isReportableExpenseTransaction(transaction: Transaction): boolean {
  return transaction.type === 'expense'
    || getTransactionReportingClass(transaction) === 'reimbursement';
}

function transactionMonthKey(transaction: Transaction): string {
  return monthKey(new Date(transaction.date));
}

export function createCalendarMonthWindows(
  start: Date,
  end: Date,
  now: Date = new Date(),
): CalendarMonthWindow[] {
  if (end < start) return [];

  const currentMonthStart = startOfLocalMonth(now);
  const windows: CalendarMonthWindow[] = [];
  let cursor = startOfLocalMonth(start);

  while (cursor <= end) {
    const monthStart = new Date(cursor);
    const monthEnd = endOfLocalMonth(cursor);
    const scopedStart = new Date(Math.max(monthStart.getTime(), start.getTime()));
    const scopedEnd = new Date(Math.min(monthEnd.getTime(), end.getTime()));

    windows.push({
      key: monthKey(monthStart),
      label: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      start: monthStart,
      end: monthEnd,
      scopedStart,
      scopedEnd,
      isComplete:
        start.getTime() <= monthStart.getTime()
        && end.getTime() >= monthEnd.getTime()
        && monthEnd.getTime() < currentMonthStart.getTime(),
    });

    cursor = offsetLocalMonth(cursor, 1);
  }

  return windows;
}

function aggregateCategorySpending(
  transactions: Transaction[],
): {
  selectedByCategory: Map<string, ExpenseAccumulator>;
  monthlyByCategory: Map<string, Map<string, ExpenseAccumulator>>;
} {
  const selectedByCategory = new Map<string, ExpenseAccumulator>();
  const monthlyByCategory = new Map<string, Map<string, ExpenseAccumulator>>();

  for (const transaction of transactions) {
    if (!isReportableExpenseTransaction(transaction)) continue;

    const selected = selectedByCategory.get(transaction.category) ?? emptyAccumulator();
    addTransaction(selected, transaction);
    selectedByCategory.set(transaction.category, selected);

    const key = transactionMonthKey(transaction);
    const byCategory = monthlyByCategory.get(key) ?? new Map<string, ExpenseAccumulator>();
    const monthly = byCategory.get(transaction.category) ?? emptyAccumulator();
    addTransaction(monthly, transaction);
    byCategory.set(transaction.category, monthly);
    monthlyByCategory.set(key, byCategory);
  }

  return { selectedByCategory, monthlyByCategory };
}

export function getCategorySpendingSummaries(
  transactions: Transaction[],
  start: Date,
  end: Date,
  lens: AnalyticsLens,
  now: Date = new Date(),
): CategorySpendingSummary[] {
  const scopedTransactions = filterByDateRange(
    filterByAnalyticsLens(transactions, lens),
    start,
    end,
  );
  const windows = createCalendarMonthWindows(start, end, now);
  const completeWindows = windows.filter((window) => window.isComplete);
  const { selectedByCategory, monthlyByCategory } = aggregateCategorySpending(scopedTransactions);

  const summaries = Array.from(selectedByCategory.entries())
    .map(([category, selectedAccumulator]) => {
      const selectedTotal = expenseAmount(selectedAccumulator);
      const completeTotal = completeWindows.reduce((sum, window) => (
        sum + expenseAmount(monthlyByCategory.get(window.key)?.get(category))
      ), 0);

      return {
        category,
        selectedTotal,
        percentage: 0,
        monthlyAverage: completeWindows.length >= 2
          ? completeTotal / completeWindows.length
          : null,
        completeMonthCount: completeWindows.length,
      };
    })
    .filter((summary) => summary.selectedTotal > 0);

  const total = summaries.reduce((sum, summary) => sum + summary.selectedTotal, 0);
  return summaries
    .map((summary) => ({
      ...summary,
      percentage: total > 0 ? summary.selectedTotal / total : 0,
    }))
    .sort((left, right) => right.selectedTotal - left.selectedTotal);
}

export function getCategoryReport(
  transactions: Transaction[],
  category: string,
  start: Date,
  end: Date,
  lens: AnalyticsLens,
  now: Date = new Date(),
  topTransactionLimit = 5,
): CategoryReport {
  const scopedTransactions = filterByDateRange(
    filterByAnalyticsLens(transactions, lens),
    start,
    end,
  ).filter((transaction) => transaction.category === category);
  const windows = createCalendarMonthWindows(start, end, now);
  const reportableTransactions = scopedTransactions.filter(isReportableExpenseTransaction);
  const monthlyAccumulators = new Map<string, ExpenseAccumulator>();
  const selectedAccumulator = emptyAccumulator();

  for (const transaction of reportableTransactions) {
    addTransaction(selectedAccumulator, transaction);
    const key = transactionMonthKey(transaction);
    const accumulator = monthlyAccumulators.get(key) ?? emptyAccumulator();
    addTransaction(accumulator, transaction);
    monthlyAccumulators.set(key, accumulator);
  }

  const monthlyPoints = windows.map((window) => ({
    key: window.key,
    label: window.label,
    amount: expenseAmount(monthlyAccumulators.get(window.key)),
    isPartial: !window.isComplete,
  }));
  const completePoints = monthlyPoints.filter((point) => !point.isPartial);
  const selectedTotal = expenseAmount(selectedAccumulator);

  return {
    category,
    selectedTotal,
    percentage: 1,
    monthlyAverage: completePoints.length >= 2
      ? completePoints.reduce((sum, point) => sum + point.amount, 0) / completePoints.length
      : null,
    completeMonthCount: completePoints.length,
    monthlyPoints,
    topTransactions: [...reportableTransactions]
      .sort((left, right) => (
        right.amount - left.amount
        || new Date(right.date).getTime() - new Date(left.date).getTime()
      ))
      .slice(0, topTransactionLimit),
  };
}

function aggregateMonthlyExpense(transactions: Transaction[]): Map<string, ExpenseAccumulator> {
  const monthly = new Map<string, ExpenseAccumulator>();
  for (const transaction of transactions) {
    if (!isReportableExpenseTransaction(transaction)) continue;
    const key = transactionMonthKey(transaction);
    const accumulator = monthly.get(key) ?? emptyAccumulator();
    addTransaction(accumulator, transaction);
    monthly.set(key, accumulator);
  }
  return monthly;
}

export function getSpendingPaceReport(
  transactions: Transaction[],
  start: Date,
  end: Date,
  lens: AnalyticsLens,
  now: Date = new Date(),
): SpendingPaceReport {
  const lensTransactions = filterByAnalyticsLens(transactions, lens);
  if (lensTransactions.length === 0) {
    return {
      points: [],
      monthlyPace: null,
      weeklyEquivalent: null,
      dailyEquivalent: null,
      baselineMonthCount: 0,
    };
  }

  const earliestTransaction = lensTransactions.reduce((earliest, transaction) => {
    const time = new Date(transaction.date).getTime();
    return time < earliest ? time : earliest;
  }, Number.POSITIVE_INFINITY);
  const earliestMonth = startOfLocalMonth(new Date(earliestTransaction));
  const monthlyExpense = aggregateMonthlyExpense(lensTransactions);
  const completeWindows = createCalendarMonthWindows(start, end, now)
    .filter((window) => window.isComplete && window.start >= earliestMonth);

  const points = completeWindows.map((window) => {
    const baselineStarts = [-2, -1, 0]
      .map((offset) => offsetLocalMonth(window.start, offset))
      .filter((monthStart) => monthStart >= earliestMonth);
    const baselineTotal = baselineStarts.reduce((sum, monthStart) => (
      sum + expenseAmount(monthlyExpense.get(monthKey(monthStart)))
    ), 0);

    return {
      key: window.key,
      label: window.label,
      actual: expenseAmount(monthlyExpense.get(window.key)),
      pace: baselineTotal / baselineStarts.length,
      baselineMonthCount: baselineStarts.length,
    };
  });

  const latest = points.at(-1);
  if (!latest) {
    return {
      points,
      monthlyPace: null,
      weeklyEquivalent: null,
      dailyEquivalent: null,
      baselineMonthCount: 0,
    };
  }

  const dailyEquivalent = latest.pace * 12 / 365.2425;
  return {
    points,
    monthlyPace: latest.pace,
    weeklyEquivalent: dailyEquivalent * 7,
    dailyEquivalent,
    baselineMonthCount: latest.baselineMonthCount,
  };
}
