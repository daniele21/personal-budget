/**
 * Domain logic — pure functions for financial calculations.
 * No React, no side effects, no UI concerns. Fully testable.
 */
import { Transaction, Budget, RecurringExpense } from '../types';

// ─── Transaction Filtering ──────────────────────────────────────────

export function filterByMonth(transactions: Transaction[], date: Date = new Date()): Transaction[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function filterByType(transactions: Transaction[], type: 'income' | 'expense'): Transaction[] {
  return transactions.filter(t => t.type === type);
}

export function filterByCategory(transactions: Transaction[], category: string): Transaction[] {
  return transactions.filter(t => t.category === category);
}

export function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// ─── Totals ─────────────────────────────────────────────────────────

export interface TransactionTotals {
  income: number;
  expenses: number;
  net: number;
}

export function calculateTotals(transactions: Transaction[]): TransactionTotals {
  const income = filterByType(transactions, 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenses = filterByType(transactions, 'expense').reduce((acc, t) => acc + t.amount, 0);
  return { income, expenses, net: income - expenses };
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
  const spent = filterByCategory(filterByType(monthlyTransactions, 'expense'), budget.category)
    .reduce((acc, t) => acc + t.amount, 0);

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
export function monthOverMonthChange(transactions: Transaction[]): number | null {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentExpenses = calculateTotals(filterByMonth(transactions, now)).expenses;
  const prevExpenses = calculateTotals(filterByMonth(transactions, prevMonth)).expenses;

  if (prevExpenses === 0) return null;
  return ((prevExpenses - currentExpenses) / prevExpenses) * 100;
}

// ─── Safe to Spend ──────────────────────────────────────────────────

export function safeToSpend(monthlyBudget: number, monthlyExpenses: number) {
  const remaining = Math.max(0, monthlyBudget - monthlyExpenses);
  const usedPercent = monthlyBudget > 0 ? Math.round((monthlyExpenses / monthlyBudget) * 100) : 0;
  return { remaining, usedPercent };
}

// ─── Spending by Category ───────────────────────────────────────────

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export function spendingByCategory(monthlyTransactions: Transaction[]): CategorySpending[] {
  const expenses = filterByType(monthlyTransactions, 'expense');
  const categories = Array.from(new Set(expenses.map(t => t.category)));
  const total = expenses.reduce((acc, t) => acc + t.amount, 0);

  return categories
    .map(cat => {
      const amount = filterByCategory(expenses, cat).reduce((acc, t) => acc + t.amount, 0);
      return {
        category: cat,
        amount,
        percentage: total > 0 ? amount / total : 0,
      };
    })
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

// ─── Recurring Bills ────────────────────────────────────────────────

export interface GeneratedTransaction {
  bill: RecurringExpense;
  transaction: Transaction;
  monthKey: string;
}

function isSameMonth(date: string, target: Date): boolean {
  const parsed = new Date(date);
  return (
    parsed.getFullYear() === target.getFullYear() &&
    parsed.getMonth() === target.getMonth()
  );
}

function matchesLegacyRecurringTransaction(transaction: Transaction, bill: RecurringExpense, today: Date): boolean {
  return (
    transaction.type === 'expense' &&
    transaction.amount === bill.amount &&
    transaction.category === bill.category &&
    transaction.title === bill.name &&
    transaction.description === `Auto-generated from recurring: ${bill.name}` &&
    isSameMonth(transaction.date, today)
  );
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

  recurring.forEach(bill => {
    const dueDate = new Date(bill.dueDate);
    const monthKey = `${bill.id}_${today.getFullYear()}_${today.getMonth()}`;

    const alreadyGenerated = existingTransactions.some((transaction) => (
      transaction.sourceRecurringId === bill.id &&
      transaction.sourceMonthKey === monthKey
    ) || matchesLegacyRecurringTransaction(transaction, bill, today));

    if (alreadyGenerated) return;

    const dueDayThisMonth = new Date(today.getFullYear(), today.getMonth(), dueDate.getDate());
    dueDayThisMonth.setHours(0, 0, 0, 0);

    const todayNormalized = new Date(today);
    todayNormalized.setHours(0, 0, 0, 0);

    if (dueDayThisMonth <= todayNormalized) {
      const transaction: Transaction = {
        id: `rec_${bill.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount: bill.amount,
        type: 'expense',
        category: bill.category,
        date: dueDayThisMonth.toISOString(),
        title: bill.name,
        description: `Auto-generated from recurring: ${bill.name}`,
        paymentMethod: 'Bank Transfer',
        sourceRecurringId: bill.id,
        sourceMonthKey: monthKey,
      };

      result.push({ bill, transaction, monthKey });
    }
  });

  return result;
}

// ─── Formatting ─────────────────────────────────────────────────────

export function formatMonthLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
