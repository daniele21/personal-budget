/**
 * Domain logic — pure functions for financial calculations.
 * No React, no side effects, no UI concerns. Fully testable.
 */
import { Transaction, Budget, RecurringExpense, TransactionReportingClass } from '../types';
import {
  buildRecurringTransaction,
  getRecurringOccurrenceKey,
  getRecurringOccurrencesInMonth,
  getUtcDateInputValue,
  reconcileRecurringTransactions,
} from './recurring';

// ─── Transaction Filtering ──────────────────────────────────────────

export type AnalyticsLens = 'actual' | 'normalized' | 'extras';

export function getTransactionReportingClass(transaction: Transaction): TransactionReportingClass {
  if (transaction.sourceRecurringId) return 'regular';
  if (transaction.reportingClass === 'extra') return 'extra';
  if (transaction.type === 'income' && transaction.reportingClass === 'reimbursement') return 'reimbursement';
  return 'regular';
}

export function filterByAnalyticsLens(transactions: Transaction[], lens: AnalyticsLens): Transaction[] {
  if (lens === 'actual') return transactions;
  return transactions.filter((transaction) => {
    const reportingClass = getTransactionReportingClass(transaction);
    return lens === 'extras' ? reportingClass === 'extra' : reportingClass !== 'extra';
  });
}

export function filterByMonth(transactions: Transaction[], date: Date = new Date()): Transaction[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d.getUTCFullYear() === year && d.getUTCMonth() === month;
  });
}

export function filterByType(transactions: Transaction[], type: 'income' | 'expense'): Transaction[] {
  return transactions.filter(t => t.type === type);
}

export function filterByCategory(transactions: Transaction[], category: string): Transaction[] {
  return transactions.filter(t => t.category === category);
}

export function filterByDateRange(transactions: Transaction[], start: Date, end: Date): Transaction[] {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return transactions.filter(t => {
    const time = new Date(t.date).getTime();
    return time >= startTime && time <= endTime;
  });
}

export function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export type TransactionSortKey = 'date' | 'amount';
export type SortDirection = 'asc' | 'desc';

export function sortTransactions(
  transactions: Transaction[],
  key: TransactionSortKey,
  direction: SortDirection,
): Transaction[] {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...transactions].sort((a, b) => {
    const left = key === 'amount' ? a.amount : new Date(a.date).getTime();
    const right = key === 'amount' ? b.amount : new Date(b.date).getTime();

    if (left === right) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }

    return (left - right) * multiplier;
  });
}

// ─── Totals ─────────────────────────────────────────────────────────

export interface TransactionTotals {
  income: number;
  expenses: number;
  net: number;
}

export function calculateTotals(transactions: Transaction[]): TransactionTotals {
  const incomeTransactions = filterByType(transactions, 'income');
  const income = incomeTransactions
    .filter((transaction) => getTransactionReportingClass(transaction) !== 'reimbursement')
    .reduce((acc, t) => acc + t.amount, 0);
  const reimbursements = incomeTransactions
    .filter((transaction) => getTransactionReportingClass(transaction) === 'reimbursement')
    .reduce((acc, t) => acc + t.amount, 0);
  const grossExpenses = filterByType(transactions, 'expense').reduce((acc, t) => acc + t.amount, 0);
  const expenses = Math.max(0, grossExpenses - reimbursements);
  const net = income + reimbursements - grossExpenses;
  return { income, expenses, net };
}

export function calculateTotalsByLens(transactions: Transaction[], lens: AnalyticsLens): TransactionTotals {
  return calculateTotals(filterByAnalyticsLens(transactions, lens));
}

export function calculateCashInflow(transactions: Transaction[]): number {
  return filterByType(transactions, 'income').reduce((acc, transaction) => acc + transaction.amount, 0);
}

export function calculateCashInflowByLens(transactions: Transaction[], lens: AnalyticsLens): number {
  return calculateCashInflow(filterByAnalyticsLens(transactions, lens));
}

export function calculateBudgetableCashInflow(transactions: Transaction[]): number {
  return filterByType(transactions, 'income')
    .filter((transaction) => getTransactionReportingClass(transaction) !== 'reimbursement')
    .reduce((acc, transaction) => acc + transaction.amount, 0);
}

export function calculateBudgetableCashInflowByLens(transactions: Transaction[], lens: AnalyticsLens): number {
  return calculateBudgetableCashInflow(filterByAnalyticsLens(transactions, lens));
}

export interface ExtraImpact {
  income: number;
  expenses: number;
  net: number;
  count: number;
}

export function getExtraImpact(transactions: Transaction[]): ExtraImpact {
  const extras = filterByAnalyticsLens(transactions, 'extras');
  const totals = calculateTotals(extras);
  return { ...totals, count: extras.length };
}

// ─── Budget Analysis ────────────────────────────────────────────────

export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export function analyzeBudget(budget: Budget, monthlyTransactions: Transaction[]): BudgetStatus {
  const categoryTransactions = filterByCategory(monthlyTransactions, budget.category);
  const spent = Math.max(0, calculateTotals(categoryTransactions).expenses);

  const remaining = Math.max(0, budget.limit - spent);
  const percent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const status: BudgetStatus['status'] =
    percent >= 100 ? 'exceeded' :
    percent >= 80 ? 'warning' :
    'ok';

  return { category: budget.category, limit: budget.limit, spent, remaining, percent, status };
}

export function analyzeBudgets(budgets: Budget[], monthlyTransactions: Transaction[]): BudgetStatus[] {
  return budgets.map(b => analyzeBudget(b, monthlyTransactions));
}

// ─── Month-over-Month ───────────────────────────────────────────────

/**
 * Returns the % change in expenses compared to last month.
 * Positive = spending less (good). Null = no previous data.
 */
export function monthOverMonthChange(transactions: Transaction[], date: Date = new Date()): number | null {
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);

  const currentExpenses = calculateTotals(filterByMonth(transactions, date)).expenses;
  const prevExpenses = calculateTotals(filterByMonth(transactions, prevMonth)).expenses;

  if (prevExpenses === 0) return null;
  return ((prevExpenses - currentExpenses) / prevExpenses) * 100;
}

// ─── Safe to Spend ──────────────────────────────────────────────────

export interface SafeToSpendStatus {
  remaining: number;
  usedPercent: number;
  effectiveLimit: number;
}

export function safeToSpend(
  monthlyBudget: number,
  monthlyExpenses: number,
  monthlyIncome: number = monthlyBudget,
): SafeToSpendStatus {
  const incomeCap = monthlyIncome > 0 ? monthlyIncome : monthlyBudget;
  const effectiveLimit = Math.max(0, Math.min(monthlyBudget, incomeCap));
  const expenses = Math.max(0, monthlyExpenses);
  const remaining = Math.max(0, effectiveLimit - expenses);
  const usedPercent = effectiveLimit > 0 ? Math.round((expenses / effectiveLimit) * 100) : 0;
  return { remaining, usedPercent, effectiveLimit };
}

// ─── Spending by Category ───────────────────────────────────────────

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export function spendingByCategory(monthlyTransactions: Transaction[]): CategorySpending[] {
  const relevantTransactions = monthlyTransactions.filter((transaction) => (
    transaction.type === 'expense' || getTransactionReportingClass(transaction) === 'reimbursement'
  ));
  const categories = Array.from(new Set(relevantTransactions.map(t => t.category)));
  const categoryAmounts = categories
    .map((category) => ({
      category,
      amount: Math.max(0, calculateTotals(filterByCategory(relevantTransactions, category)).expenses),
    }))
    .filter((category) => category.amount > 0);
  const total = categoryAmounts.reduce((acc, item) => acc + item.amount, 0);

  return categoryAmounts
    .map((category) => ({
      ...category,
      percentage: total > 0 ? category.amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ─── Period Comparison ─────────────────────────────────────────────

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface CategoryDelta {
  category: string;
  amountA: number;
  amountB: number;
  delta: number;
  deltaPercent: number | null;
}

export interface PeriodComparison {
  rangeA: DateRange;
  rangeB: DateRange;
  transactionsA: Transaction[];
  transactionsB: Transaction[];
  totalsA: TransactionTotals;
  totalsB: TransactionTotals;
  categoryDeltas: CategoryDelta[];
  insights: string[];
}

export function createMonthRange(year: number, month: number): DateRange {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return {
    start,
    end,
    label: start.toLocaleString('default', { month: 'long', year: 'numeric' }),
  };
}

export function normalizeDateRange(startInput: string | Date, endInput: string | Date, label?: string): DateRange {
  const start = new Date(startInput);
  const end = new Date(endInput);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start.getTime() <= end.getTime()) {
    return { start, end, label: label ?? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` };
  }

  return { start: end, end: start, label: label ?? `${end.toLocaleDateString()} - ${start.toLocaleDateString()}` };
}

export function getCategoryDeltas(transactionsA: Transaction[], transactionsB: Transaction[]): CategoryDelta[] {
  const reportableA = transactionsA.filter((transaction) => (
    transaction.type === 'expense' || getTransactionReportingClass(transaction) === 'reimbursement'
  ));
  const reportableB = transactionsB.filter((transaction) => (
    transaction.type === 'expense' || getTransactionReportingClass(transaction) === 'reimbursement'
  ));
  const categories = Array.from(new Set([...reportableA.map((t) => t.category), ...reportableB.map((t) => t.category)]));

  return categories
    .map((category) => {
      const amountA = Math.max(0, calculateTotals(filterByCategory(reportableA, category)).expenses);
      const amountB = Math.max(0, calculateTotals(filterByCategory(reportableB, category)).expenses);
      const delta = amountA - amountB;
      const deltaPercent = amountB > 0 ? (delta / amountB) * 100 : amountA > 0 ? null : 0;
      return { category, amountA, amountB, delta, deltaPercent };
    })
    .filter((item) => item.amountA > 0 || item.amountB > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function getComparisonInsights(totalsA: TransactionTotals, totalsB: TransactionTotals, deltas: CategoryDelta[]): string[] {
  const insights: string[] = [];
  const expenseDelta = totalsA.expenses - totalsB.expenses;
  const incomeDelta = totalsA.income - totalsB.income;

  if (totalsB.expenses > 0) {
    const percent = Math.abs((expenseDelta / totalsB.expenses) * 100).toFixed(0);
    insights.push(expenseDelta <= 0 ? `Expenses are down ${percent}% versus period B.` : `Expenses are up ${percent}% versus period B.`);
  }

  if (totalsB.income > 0) {
    const percent = Math.abs((incomeDelta / totalsB.income) * 100).toFixed(0);
    insights.push(incomeDelta >= 0 ? `Income is up ${percent}% versus period B.` : `Income is down ${percent}% versus period B.`);
  }

  const biggestIncrease = deltas.find((item) => item.delta > 0);
  const biggestDecrease = deltas.find((item) => item.delta < 0);
  if (biggestIncrease) insights.push(`Biggest increase: ${biggestIncrease.category}.`);
  if (biggestDecrease) insights.push(`Biggest decrease: ${biggestDecrease.category}.`);

  return insights.slice(0, 4);
}

export function comparePeriods(transactions: Transaction[], rangeA: DateRange, rangeB: DateRange): PeriodComparison {
  const transactionsA = filterByDateRange(transactions, rangeA.start, rangeA.end);
  const transactionsB = filterByDateRange(transactions, rangeB.start, rangeB.end);
  const totalsA = calculateTotals(transactionsA);
  const totalsB = calculateTotals(transactionsB);
  const categoryDeltas = getCategoryDeltas(transactionsA, transactionsB);

  return {
    rangeA,
    rangeB,
    transactionsA,
    transactionsB,
    totalsA,
    totalsB,
    categoryDeltas,
    insights: getComparisonInsights(totalsA, totalsB, categoryDeltas),
  };
}

export interface TrendPoint {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export function getMonthlyBreakdown(transactions: Transaction[], year: number): TrendPoint[] {
  return Array.from({ length: 12 }, (_, month) => {
    const monthTransactions = filterByMonth(transactions, new Date(year, month, 1));
    const totals = calculateTotals(monthTransactions);
    return {
      label: new Date(year, month, 1).toLocaleString('default', { month: 'short' }),
      income: totals.income,
      expenses: totals.expenses,
      net: totals.net,
    };
  });
}

// ─── Year Review ───────────────────────────────────────────────────

export interface DailySpending {
  date: string;
  amount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface CategoryShift {
  category: string;
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
}

export interface AnnualReview {
  year: number;
  transactions: Transaction[];
  totals: TransactionTotals;
  savingsRate: number | null;
  monthlyBreakdown: TrendPoint[];
  topCategories: CategorySpending[];
  biggestExpense: Transaction | null;
  biggestIncome: Transaction | null;
  savedMonths: number;
  bestMonth: TrendPoint | null;
  heatmap: DailySpending[];
  categoryShifts: CategoryShift[];
  highlights: string[];
}

export function filterByYear(transactions: Transaction[], year: number): Transaction[] {
  return transactions.filter((transaction) => new Date(transaction.date).getUTCFullYear() === year);
}

function formatDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getDailySpendingHeatmap(transactions: Transaction[], year: number): DailySpending[] {
  const expenses = filterByType(filterByYear(transactions, year), 'expense');
  const totalsByDay = new Map<string, number>();
  expenses.forEach((transaction) => {
    const key = formatDateKey(new Date(transaction.date));
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + transaction.amount);
  });

  const max = Math.max(0, ...Array.from(totalsByDay.values()));
  const days: DailySpending[] = [];
  const current = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  while (current <= end) {
    const date = formatDateKey(current);
    const amount = totalsByDay.get(date) ?? 0;
    const ratio = max > 0 ? amount / max : 0;
    const intensity = amount === 0 ? 0 : ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
    days.push({ date, amount, intensity });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function getCategoryShifts(transactions: Transaction[], year: number): CategoryShift[] {
  const current = spendingByCategory(filterByYear(transactions, year));
  const previous = spendingByCategory(filterByYear(transactions, year - 1));
  const categories = Array.from(new Set([...current.map((item) => item.category), ...previous.map((item) => item.category)]));

  return categories
    .map((category) => {
      const currentAmount = current.find((item) => item.category === category)?.amount ?? 0;
      const previousAmount = previous.find((item) => item.category === category)?.amount ?? 0;
      const delta = currentAmount - previousAmount;
      const deltaPercent = previousAmount > 0 ? (delta / previousAmount) * 100 : currentAmount > 0 ? null : 0;
      return { category, current: currentAmount, previous: previousAmount, delta, deltaPercent };
    })
    .filter((item) => item.current > 0 || item.previous > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function getAnnualReview(transactions: Transaction[], year: number): AnnualReview {
  const annualTransactions = filterByYear(transactions, year);
  const totals = calculateTotals(annualTransactions);
  const expenses = filterByType(annualTransactions, 'expense');
  const income = filterByType(annualTransactions, 'income');
  const monthlyBreakdown = getMonthlyBreakdown(transactions, year);
  const savedMonths = monthlyBreakdown.filter((month) => month.net > 0).length;
  const bestMonth = monthlyBreakdown.reduce<TrendPoint | null>((best, month) => {
    if (!best || month.net > best.net) return month;
    return best;
  }, null);
  const biggestExpense = expenses.reduce<Transaction | null>((max, item) => (!max || item.amount > max.amount ? item : max), null);
  const biggestIncome = income.reduce<Transaction | null>((max, item) => (!max || item.amount > max.amount ? item : max), null);
  const savingsRate = totals.income > 0 ? (totals.net / totals.income) * 100 : null;
  const topCategories = spendingByCategory(annualTransactions).slice(0, 5);
  const categoryShifts = getCategoryShifts(transactions, year);

  const highlights: string[] = [];
  if (bestMonth) highlights.push(`Best month: ${bestMonth.label}.`);
  highlights.push(`Saved money in ${savedMonths} of 12 months.`);
  if (biggestExpense) highlights.push(`Biggest expense: ${biggestExpense.title || biggestExpense.category}.`);
  if (topCategories[0]) highlights.push(`Top spending category: ${topCategories[0].category}.`);

  return {
    year,
    transactions: annualTransactions,
    totals,
    savingsRate,
    monthlyBreakdown,
    topCategories,
    biggestExpense,
    biggestIncome,
    savedMonths,
    bestMonth,
    heatmap: getDailySpendingHeatmap(transactions, year),
    categoryShifts,
    highlights,
  };
}

// ─── Recurring Bills ────────────────────────────────────────────────

export interface GeneratedTransaction {
  bill: RecurringExpense;
  transaction: Transaction;
  monthKey: string;
}

function isSameUtcMonth(date: string, target: Date): boolean {
  const parsed = new Date(date);
  return (
    parsed.getUTCFullYear() === target.getUTCFullYear() &&
    parsed.getUTCMonth() === target.getUTCMonth()
  );
}

function formatLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function matchesLegacyRecurringTransaction(transaction: Transaction, bill: RecurringExpense, today: Date): boolean {
  return (
    transaction.type === (bill.type ?? 'expense') &&
    transaction.amount === bill.amount &&
    transaction.category === bill.category &&
    transaction.title === bill.name &&
    transaction.description === `Auto-generated from recurring: ${bill.name}` &&
    isSameUtcMonth(transaction.date, today)
  );
}

function getRecurringCandidateMonths(bill: RecurringExpense, today: Date): Array<{ year: number; monthIndex: number }> {
  const startDate = new Date(bill.startDate);
  if (Number.isNaN(startDate.getTime())) return [];

  const firstMonth = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
  const months: Array<{ year: number; monthIndex: number }> = [];

  let cursor = firstMonth;
  while (cursor <= lastMonth) {
    months.push({
      year: cursor.getUTCFullYear(),
      monthIndex: cursor.getUTCMonth(),
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return months;
}

/**
 * Determines which recurring bills should generate transactions.
 * Pure function — does not perform side effects.
 */
export function getRecurringDue(
  recurring: RecurringExpense[],
  existingTransactions: Transaction[],
  today: Date = new Date()
): GeneratedTransaction[] {
  const result: GeneratedTransaction[] = [];
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  recurring.forEach(bill => {
    getRecurringCandidateMonths(bill, todayNormalized).forEach(({ year, monthIndex }) => {
      const occurrenceDates = getRecurringOccurrencesInMonth(bill, year, monthIndex);

      occurrenceDates.forEach((occurrenceDate) => {
        if (getUtcDateInputValue(occurrenceDate.toISOString()) > formatLocalDateKey(todayNormalized)) {
          return;
        }

        const occurrenceKey = getRecurringOccurrenceKey(bill, occurrenceDate);
        const alreadyGenerated = existingTransactions.some((transaction) => (
          transaction.sourceRecurringId === bill.id &&
          transaction.sourceMonthKey === occurrenceKey
        ) || (
          (bill.frequency ?? 'monthly') === 'monthly' &&
          matchesLegacyRecurringTransaction(transaction, bill, occurrenceDate)
        ));

        if (alreadyGenerated) return;

        const transaction = buildRecurringTransaction(bill, occurrenceKey, occurrenceDate);
        if (!transaction) return;

        result.push({ bill, transaction, monthKey: occurrenceKey });
      });
    });
  });

  return result;
}

/**
 * Builds the canonical transaction ledger after recurring changes.
 *
 * First reconciles already materialized recurring transactions with their
 * source template, then generates any due occurrences missing from history.
 */
export function syncRecurringTransactions(
  recurring: RecurringExpense[],
  existingTransactions: Transaction[],
  today: Date = new Date(),
): Transaction[] {
  const reconciledTransactions = reconcileRecurringTransactions(existingTransactions, recurring);
  const generatedTransactions = getRecurringDue(recurring, reconciledTransactions, today)
    .map(({ transaction }) => transaction);

  return generatedTransactions.length > 0
    ? [...generatedTransactions, ...reconciledTransactions]
    : reconciledTransactions;
}

// ─── Formatting ─────────────────────────────────────────────────────

export function formatMonthLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
