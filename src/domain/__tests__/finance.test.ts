import { describe, it, expect } from 'vitest';
import {
  filterByMonth,
  filterByType,
  filterByCategory,
  filterByDateRange,
  sortByDateDesc,
  sortTransactions,
  calculateTotals,
  calculateBudgetableCashInflow,
  calculateBudgetableCashInflowByLens,
  calculateCashInflow,
  calculateCashInflowByLens,
  calculateTotalsByLens,
  filterByAnalyticsLens,
  getExtraImpact,
  getTransactionReportingClass,
  analyzeBudget,
  analyzeBudgets,
  expenseMonthOverMonthChange,
  netMonthOverMonthChange,
  safeToSpend,
  spendingByCategory,
  getRecurringDue,
  formatMonthLabel,
  comparePeriods,
  createMonthRange,
  filterByYear,
  getAnnualReview,
  getCategoryDeltas,
  getDailySpendingHeatmap,
  getMonthlyBreakdown,
  getCategoryComparisonTrend,
} from '../finance';
import { Transaction, Budget, RecurringExpense } from '../../types';

// ─── Test Helpers ───────────────────────────────────────────────────

function tx(overrides: Partial<Transaction> & { amount: number; type: 'income' | 'expense' }): Transaction {
  return {
    id: Math.random().toString(36).slice(2, 8),
    category: 'Food',
    date: '2026-04-15T00:00:00.000Z',
    title: 'Test',
    description: '',
    paymentMethod: 'Cash',
    ...overrides,
  };
}

function budget(category: string, limit: number): Budget {
  return { category, limit, spent: 0, currency: '€' };
}

function recurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'r1',
    name: 'Netflix',
    amount: 12.99,
    startDate: '2026-04-05T00:00:00.000Z',
    endDate: '2027-04-04T00:00:00.000Z',
    dayOfMonth: 5,
    category: 'Entertainment',
    type: 'expense',
    ...overrides,
  };
}

// ─── filterByMonth ──────────────────────────────────────────────────

describe('filterByMonth', () => {
  const april2026 = new Date(2026, 3, 15);
  const march2026 = new Date(2026, 2, 10);

  const transactions = [
    tx({ amount: 100, type: 'expense', date: '2026-04-10T00:00:00.000Z' }),
    tx({ amount: 200, type: 'income', date: '2026-04-25T00:00:00.000Z' }),
    tx({ amount: 50, type: 'expense', date: '2026-03-15T00:00:00.000Z' }),
    tx({ amount: 75, type: 'income', date: '2025-04-10T00:00:00.000Z' }), // same month, different year
  ];

  it('returns only transactions for the given month and year', () => {
    const result = filterByMonth(transactions, april2026);
    expect(result).toHaveLength(2);
    expect(result.every(t => new Date(t.date).getMonth() === 3)).toBe(true);
    expect(result.every(t => new Date(t.date).getFullYear() === 2026)).toBe(true);
  });

  it('returns march transactions when filtered for march', () => {
    expect(filterByMonth(transactions, march2026)).toHaveLength(1);
  });

  it('returns empty array when no transactions match', () => {
    expect(filterByMonth(transactions, new Date(2020, 0, 1))).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterByMonth([], april2026)).toHaveLength(0);
  });

  it('defaults to current month when no date provided', () => {
    const now = new Date();
    const thisMonthTx = tx({
      amount: 10,
      type: 'expense',
      date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
    });
    expect(filterByMonth([thisMonthTx])).toHaveLength(1);
  });
});

// ─── filterByType ───────────────────────────────────────────────────

describe('filterByType', () => {
  const mixed = [
    tx({ amount: 100, type: 'expense' }),
    tx({ amount: 200, type: 'income' }),
    tx({ amount: 50, type: 'expense' }),
  ];

  it('filters expenses', () => {
    expect(filterByType(mixed, 'expense')).toHaveLength(2);
  });

  it('filters income', () => {
    expect(filterByType(mixed, 'income')).toHaveLength(1);
  });

  it('returns empty for empty input', () => {
    expect(filterByType([], 'expense')).toHaveLength(0);
  });
});

describe('analytics lenses', () => {
  const transactions = [
    tx({ amount: 100, type: 'expense', category: 'Food' }),
    tx({ amount: 250, type: 'expense', category: 'Travel', reportingClass: 'extra', reportingNote: 'Trip' }),
    tx({ amount: 3000, type: 'income', category: 'Salary' }),
    tx({ amount: 500, type: 'income', category: 'Bonus', reportingClass: 'extra' }),
    tx({ amount: 40, type: 'income', category: 'Food', reportingClass: 'reimbursement' }),
    tx({ amount: 80, type: 'expense', category: 'Subscriptions', sourceRecurringId: 'r1', reportingClass: 'extra' }),
  ];

  it('treats missing reporting class and recurring transactions as regular', () => {
    expect(getTransactionReportingClass(transactions[0])).toBe('regular');
    expect(getTransactionReportingClass(transactions[5])).toBe('regular');
  });

  it('recognizes reimbursement income as its own reporting class', () => {
    expect(getTransactionReportingClass(transactions[4])).toBe('reimbursement');
  });

  it('filters actual, normalized, and extras lenses', () => {
    expect(filterByAnalyticsLens(transactions, 'actual')).toHaveLength(6);
    expect(filterByAnalyticsLens(transactions, 'normalized').map(item => item.amount)).toEqual([100, 3000, 40, 80]);
    expect(filterByAnalyticsLens(transactions, 'extras').map(item => item.amount)).toEqual([250, 500]);
  });

  it('calculates totals by analytics lens', () => {
    expect(calculateTotalsByLens(transactions, 'actual')).toEqual({ income: 3500, expenses: 390, net: 3110 });
    expect(calculateTotalsByLens(transactions, 'normalized')).toEqual({ income: 3000, expenses: 140, net: 2860 });
    expect(calculateTotalsByLens(transactions, 'extras')).toEqual({ income: 500, expenses: 250, net: 250 });
  });

  it('summarizes extra impact', () => {
    expect(getExtraImpact(transactions)).toEqual({ income: 500, expenses: 250, net: 250, count: 2 });
  });
});

// ─── filterByCategory ───────────────────────────────────────────────

describe('filterByCategory', () => {
  const transactions = [
    tx({ amount: 100, type: 'expense', category: 'Food' }),
    tx({ amount: 50, type: 'expense', category: 'Transport' }),
    tx({ amount: 30, type: 'expense', category: 'Food' }),
  ];

  it('returns only matching category', () => {
    expect(filterByCategory(transactions, 'Food')).toHaveLength(2);
  });

  it('returns empty for non-existent category', () => {
    expect(filterByCategory(transactions, 'Gaming')).toHaveLength(0);
  });
});

// ─── filterByDateRange ──────────────────────────────────────────────

describe('filterByDateRange', () => {
  const transactions = [
    tx({ amount: 100, type: 'expense', date: '2026-04-01T10:00:00.000Z' }),
    tx({ amount: 50, type: 'expense', date: '2026-04-15T12:00:00.000Z' }),
    tx({ amount: 30, type: 'expense', date: '2026-05-01T00:00:00.000Z' }),
  ];

  it('returns only transactions inside the inclusive range', () => {
    const result = filterByDateRange(
      transactions,
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-30T23:59:59.999Z'),
    );

    expect(result).toHaveLength(2);
    expect(result.map(item => item.amount)).toEqual([100, 50]);
  });

  it('returns empty array when nothing matches the range', () => {
    expect(
      filterByDateRange(
        transactions,
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-31T23:59:59.999Z'),
      ),
    ).toEqual([]);
  });
});

// ─── sortByDateDesc ─────────────────────────────────────────────────

describe('sortByDateDesc', () => {
  it('sorts newest first', () => {
    const transactions = [
      tx({ amount: 10, type: 'expense', date: '2026-01-01T00:00:00.000Z' }),
      tx({ amount: 20, type: 'expense', date: '2026-03-01T00:00:00.000Z' }),
      tx({ amount: 30, type: 'expense', date: '2026-02-01T00:00:00.000Z' }),
    ];
    const sorted = sortByDateDesc(transactions);
    expect(sorted[0].amount).toBe(20);
    expect(sorted[1].amount).toBe(30);
    expect(sorted[2].amount).toBe(10);
  });

  it('does not mutate the original array', () => {
    const original = [
      tx({ amount: 10, type: 'expense', date: '2026-01-01T00:00:00.000Z' }),
      tx({ amount: 20, type: 'expense', date: '2026-03-01T00:00:00.000Z' }),
    ];
    const sorted = sortByDateDesc(original);
    expect(sorted).not.toBe(original);
  });

  it('handles empty array', () => {
    expect(sortByDateDesc([])).toEqual([]);
  });
});

// ─── sortTransactions ───────────────────────────────────────────────

describe('sortTransactions', () => {
  const transactions = [
    tx({ amount: 10, type: 'expense', date: '2026-01-01T00:00:00.000Z' }),
    tx({ amount: 30, type: 'expense', date: '2026-03-01T00:00:00.000Z' }),
    tx({ amount: 20, type: 'expense', date: '2026-02-01T00:00:00.000Z' }),
  ];

  it('sorts by amount ascending', () => {
    const sorted = sortTransactions(transactions, 'amount', 'asc');
    expect(sorted.map(item => item.amount)).toEqual([10, 20, 30]);
  });

  it('sorts by amount descending', () => {
    const sorted = sortTransactions(transactions, 'amount', 'desc');
    expect(sorted.map(item => item.amount)).toEqual([30, 20, 10]);
  });

  it('sorts by date ascending', () => {
    const sorted = sortTransactions(transactions, 'date', 'asc');
    expect(sorted.map(item => item.amount)).toEqual([10, 20, 30]);
  });

  it('sorts by date descending', () => {
    const sorted = sortTransactions(transactions, 'date', 'desc');
    expect(sorted.map(item => item.amount)).toEqual([30, 20, 10]);
  });
});

// ─── calculateTotals ────────────────────────────────────────────────

describe('calculateTotals', () => {
  it('calculates income, expenses, and net', () => {
    const transactions = [
      tx({ amount: 1000, type: 'income' }),
      tx({ amount: 300, type: 'expense' }),
      tx({ amount: 200, type: 'expense' }),
    ];
    const totals = calculateTotals(transactions);
    expect(totals.income).toBe(1000);
    expect(totals.expenses).toBe(500);
    expect(totals.net).toBe(500);
  });

  it('returns zeros for empty array', () => {
    const totals = calculateTotals([]);
    expect(totals).toEqual({ income: 0, expenses: 0, net: 0 });
  });

  it('handles income-only', () => {
    const totals = calculateTotals([tx({ amount: 500, type: 'income' })]);
    expect(totals.net).toBe(500);
    expect(totals.expenses).toBe(0);
  });

  it('handles expense-only (negative net)', () => {
    const totals = calculateTotals([tx({ amount: 300, type: 'expense' })]);
    expect(totals.net).toBe(-300);
    expect(totals.income).toBe(0);
  });

  it('treats reimbursement income as expense reduction instead of income', () => {
    const totals = calculateTotals([
      tx({ amount: 1000, type: 'income', category: 'Salary' }),
      tx({ amount: 300, type: 'expense', category: 'Medical' }),
      tx({ amount: 75, type: 'income', category: 'Medical', reportingClass: 'reimbursement' }),
    ]);
    expect(totals).toEqual({ income: 1000, expenses: 225, net: 775 });
  });

  it('does not expose negative expenses when reimbursements exceed expenses', () => {
    const totals = calculateTotals([
      tx({ amount: 1000, type: 'income', category: 'Salary' }),
      tx({ amount: 100, type: 'expense', category: 'Medical' }),
      tx({ amount: 150, type: 'income', category: 'Medical', reportingClass: 'reimbursement' }),
    ]);
    expect(totals).toEqual({ income: 1000, expenses: 0, net: 1050 });
  });

  it('keeps reimbursement in total cash inflow while excluding it from income totals', () => {
    const transactions = [
      tx({ amount: 100, type: 'income', category: 'Medical', reportingClass: 'reimbursement' }),
      tx({ amount: 250, type: 'income', category: 'Bonus', reportingClass: 'extra' }),
    ];

    expect(calculateTotals(transactions)).toEqual({ income: 250, expenses: 0, net: 350 });
    expect(calculateCashInflow(transactions)).toBe(350);
    expect(calculateCashInflowByLens(transactions, 'normalized')).toBe(100);
  });

  it('excludes reimbursements from the income cap used by safe-to-spend', () => {
    const transactions = [
      tx({ amount: 100, type: 'income', category: 'Medical', reportingClass: 'reimbursement' }),
      tx({ amount: 250, type: 'income', category: 'Bonus', reportingClass: 'extra' }),
    ];

    expect(calculateBudgetableCashInflow(transactions)).toBe(250);
    expect(calculateBudgetableCashInflowByLens(transactions, 'normalized')).toBe(0);
  });
});

// ─── comparison and annual review ──────────────────────────────────

describe('comparePeriods', () => {
  const transactions = [
    tx({ amount: 1000, type: 'income', category: 'Salary', date: '2026-04-01T00:00:00.000Z' }),
    tx({ amount: 300, type: 'expense', category: 'Dining', date: '2026-04-10T00:00:00.000Z' }),
    tx({ amount: 200, type: 'expense', category: 'Dining', date: '2026-03-10T00:00:00.000Z' }),
    tx({ amount: 75, type: 'expense', category: 'Transport', date: '2026-03-12T00:00:00.000Z' }),
  ];

  it('compares totals and category deltas between two month ranges', () => {
    const comparison = comparePeriods(
      transactions,
      createMonthRange(2026, 3),
      createMonthRange(2026, 2),
    );

    expect(comparison.totalsA.income).toBe(1000);
    expect(comparison.totalsA.expenses).toBe(300);
    expect(comparison.totalsB.expenses).toBe(275);
    expect(comparison.categoryDeltas.find((item) => item.category === 'Dining')?.delta).toBe(100);
  });
});

describe('getCategoryDeltas', () => {
  it('returns null percent when the previous period had no category spend', () => {
    const deltas = getCategoryDeltas(
      [tx({ amount: 50, type: 'expense', category: 'Health' })],
      [],
    );
    expect(deltas[0]).toMatchObject({ category: 'Health', delta: 50, deltaPercent: null });
  });

  it('compares category spend net of reimbursements', () => {
    const deltas = getCategoryDeltas(
      [
        tx({ amount: 302, type: 'expense', category: 'Health' }),
        tx({ amount: 14, type: 'expense', category: 'Health' }),
        tx({ amount: 240, type: 'income', category: 'Health', reportingClass: 'reimbursement' }),
      ],
      [tx({ amount: 100, type: 'expense', category: 'Health' })],
    );

    expect(deltas[0]).toMatchObject({
      category: 'Health',
      amountA: 76,
      amountB: 100,
      delta: -24,
    });
  });
});

describe('annual review helpers', () => {
  const annualTransactions = [
    tx({ amount: 1200, type: 'income', category: 'Salary', title: 'Salary', date: '2026-01-05T00:00:00.000Z' }),
    tx({ amount: 400, type: 'expense', category: 'Housing', title: 'Rent', date: '2026-01-10T00:00:00.000Z' }),
    tx({ amount: 200, type: 'expense', category: 'Dining', title: 'Dinner', date: '2026-02-10T00:00:00.000Z' }),
    tx({ amount: 100, type: 'expense', category: 'Dining', title: 'Dinner', date: '2025-02-10T00:00:00.000Z' }),
  ];

  it('filters transactions by year', () => {
    expect(filterByYear(annualTransactions, 2026)).toHaveLength(3);
  });

  it('builds 12 monthly trend points', () => {
    const breakdown = getMonthlyBreakdown(annualTransactions, 2026);
    expect(breakdown).toHaveLength(12);
    expect(breakdown[0].income).toBe(1200);
  });

  it('builds a heatmap for every day in the year', () => {
    expect(getDailySpendingHeatmap(annualTransactions, 2026)).toHaveLength(365);
  });

  it('summarizes annual review metrics', () => {
    const review = getAnnualReview(annualTransactions, 2026);
    expect(review.totals.income).toBe(1200);
    expect(review.topCategories[0].category).toBe('Housing');
    expect(review.biggestExpense?.title).toBe('Rent');
    expect(review.categoryShifts.find((item) => item.category === 'Dining')?.delta).toBe(100);
  });
});

// ─── analyzeBudget ──────────────────────────────────────────────────

describe('analyzeBudget', () => {
  const monthlyTxs = [
    tx({ amount: 150, type: 'expense', category: 'Food' }),
    tx({ amount: 50, type: 'expense', category: 'Food' }),
    tx({ amount: 300, type: 'income', category: 'Food' }), // income should be ignored
    tx({ amount: 25, type: 'income', category: 'Food', reportingClass: 'reimbursement' }),
    tx({ amount: 100, type: 'expense', category: 'Transport' }), // different category
  ];

  it('calculates spent from expenses minus reimbursements for matching category', () => {
    const result = analyzeBudget(budget('Food', 500), monthlyTxs);
    expect(result.spent).toBe(175);
    expect(result.remaining).toBe(325);
  });

  it('returns ok status under 80%', () => {
    expect(analyzeBudget(budget('Food', 500), monthlyTxs).status).toBe('ok');
  });

  it('returns warning status at 80-99%', () => {
    const result = analyzeBudget(budget('Food', 200), monthlyTxs);
    expect(result.percent).toBeCloseTo(87.5, 1);
    expect(result.status).toBe('warning');
  });

  it('returns exceeded status at 100%+', () => {
    const result = analyzeBudget(budget('Food', 150), monthlyTxs);
    expect(result.percent).toBeCloseTo(116.67, 1);
    expect(result.status).toBe('exceeded');
    expect(result.remaining).toBe(0);
  });

  it('handles zero limit without division error', () => {
    const result = analyzeBudget(budget('Food', 0), monthlyTxs);
    expect(result.percent).toBe(0);
    expect(result.status).toBe('ok');
  });

  it('handles no transactions for category', () => {
    const result = analyzeBudget(budget('Gaming', 100), monthlyTxs);
    expect(result.spent).toBe(0);
    expect(result.remaining).toBe(100);
    expect(result.status).toBe('ok');
  });
});

// ─── analyzeBudgets ─────────────────────────────────────────────────

describe('analyzeBudgets', () => {
  it('maps all budgets to statuses', () => {
    const budgets = [budget('Food', 500), budget('Transport', 200)];
    const txs = [tx({ amount: 100, type: 'expense', category: 'Food' })];
    const results = analyzeBudgets(budgets, txs);
    expect(results).toHaveLength(2);
    expect(results[0].category).toBe('Food');
    expect(results[1].category).toBe('Transport');
  });
});

// ─── safeToSpend ────────────────────────────────────────────────────

describe('safeToSpend', () => {
  it('calculates remaining and used percent', () => {
    const result = safeToSpend(2000, 800);
    expect(result.remaining).toBe(1200);
    expect(result.usedPercent).toBe(40);
    expect(result.effectiveLimit).toBe(2000);
  });

  it('limits safe spending by monthly income when income is below budget', () => {
    const result = safeToSpend(2000, 800, 1200);
    expect(result.remaining).toBe(400);
    expect(result.usedPercent).toBe(67);
    expect(result.effectiveLimit).toBe(1200);
  });

  it('keeps the monthly budget as the cap when income is above budget', () => {
    const result = safeToSpend(2000, 800, 3000);
    expect(result.remaining).toBe(1200);
    expect(result.usedPercent).toBe(40);
    expect(result.effectiveLimit).toBe(2000);
  });

  it('clamps remaining to zero when overspent', () => {
    const result = safeToSpend(1000, 1500);
    expect(result.remaining).toBe(0);
    expect(result.usedPercent).toBe(150);
    expect(result.effectiveLimit).toBe(1000);
  });

  it('handles zero budget', () => {
    const result = safeToSpend(0, 100);
    expect(result.remaining).toBe(0);
    expect(result.usedPercent).toBe(0);
    expect(result.effectiveLimit).toBe(0);
  });

  it('handles zero expenses', () => {
    const result = safeToSpend(2000, 0);
    expect(result.remaining).toBe(2000);
    expect(result.usedPercent).toBe(0);
    expect(result.effectiveLimit).toBe(2000);
  });

  it('does not let negative expenses inflate safe spending above the effective limit', () => {
    const result = safeToSpend(2000, -100, 2000);
    expect(result.remaining).toBe(2000);
    expect(result.usedPercent).toBe(0);
    expect(result.effectiveLimit).toBe(2000);
  });

  it('falls back to the configured budget when no budgetable income is recorded', () => {
    const result = safeToSpend(2000, 800, 0);
    expect(result.remaining).toBe(1200);
    expect(result.usedPercent).toBe(40);
    expect(result.effectiveLimit).toBe(2000);
  });
});

// ─── spendingByCategory ─────────────────────────────────────────────

describe('spendingByCategory', () => {
  const transactions = [
    tx({ amount: 200, type: 'expense', category: 'Food' }),
    tx({ amount: 100, type: 'expense', category: 'Transport' }),
    tx({ amount: 100, type: 'expense', category: 'Food' }),
    tx({ amount: 50, type: 'income', category: 'Food', reportingClass: 'reimbursement' }),
    tx({ amount: 500, type: 'income', category: 'Salary' }), // income ignored
  ];

  it('groups expenses by category with percentages', () => {
    const result = spendingByCategory(transactions);
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe('Food');
    expect(result[0].amount).toBe(250);
    expect(result[0].percentage).toBeCloseTo(0.714);
    expect(result[1].category).toBe('Transport');
    expect(result[1].amount).toBe(100);
    expect(result[1].percentage).toBeCloseTo(0.286);
  });

  it('floors a category at zero when reimbursements exceed category expenses', () => {
    const result = spendingByCategory([
      tx({ amount: 120, type: 'expense', category: 'Health' }),
      tx({ amount: 200, type: 'income', category: 'Health', reportingClass: 'reimbursement' }),
    ]);

    expect(result).toEqual([]);
  });

  it('sorts by amount descending', () => {
    const result = spendingByCategory(transactions);
    expect(result[0].amount).toBeGreaterThanOrEqual(result[1].amount);
  });

  it('returns empty for no expenses', () => {
    expect(spendingByCategory([])).toEqual([]);
  });

  it('returns empty when only income', () => {
    expect(spendingByCategory([tx({ amount: 500, type: 'income' })])).toEqual([]);
  });
});

// ─── Month-over-month changes ──────────────────────────────────────

describe('expenseMonthOverMonthChange', () => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 10).toISOString();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString();

  it('returns positive when spending decreased', () => {
    const transactions = [
      tx({ amount: 500, type: 'expense', date: lastMonth }),
      tx({ amount: 300, type: 'expense', date: thisMonth }),
    ];
    const change = expenseMonthOverMonthChange(transactions);
    expect(change).toBeCloseTo(40); // (500-300)/500 * 100
  });

  it('returns negative when spending increased', () => {
    const transactions = [
      tx({ amount: 300, type: 'expense', date: lastMonth }),
      tx({ amount: 500, type: 'expense', date: thisMonth }),
    ];
    const change = expenseMonthOverMonthChange(transactions);
    expect(change).toBeCloseTo(-66.67, 1);
  });

  it('returns null when no previous month data', () => {
    const transactions = [
      tx({ amount: 300, type: 'expense', date: thisMonth }),
    ];
    expect(expenseMonthOverMonthChange(transactions)).toBeNull();
  });

  it('returns null when no data at all', () => {
    expect(expenseMonthOverMonthChange([])).toBeNull();
  });
});

describe('netMonthOverMonthChange', () => {
  const anchor = new Date(2026, 3, 1);

  it('compares net cash flow rather than expenses', () => {
    const transactions = [
      tx({ amount: 1000, type: 'income', date: '2026-03-10T00:00:00.000Z' }),
      tx({ amount: 600, type: 'expense', date: '2026-03-11T00:00:00.000Z' }),
      tx({ amount: 1000, type: 'income', date: '2026-04-10T00:00:00.000Z' }),
      tx({ amount: 500, type: 'expense', date: '2026-04-11T00:00:00.000Z' }),
    ];

    expect(netMonthOverMonthChange(transactions, anchor)).toBeCloseTo(25);
  });

  it('uses the absolute previous net for a negative baseline', () => {
    const transactions = [
      tx({ amount: 100, type: 'expense', date: '2026-03-10T00:00:00.000Z' }),
      tx({ amount: 50, type: 'income', date: '2026-04-10T00:00:00.000Z' }),
    ];

    expect(netMonthOverMonthChange(transactions, anchor)).toBeCloseTo(150);
  });
});

describe('getCategoryComparisonTrend', () => {
  it('uses weekly buckets for custom ranges up to 45 days', () => {
    const points = getCategoryComparisonTrend(
      [
        tx({ amount: 10, type: 'expense', category: 'Food', date: '2026-01-10T12:00:00.000Z' }),
        tx({ amount: 20, type: 'expense', category: 'Food', date: '2026-01-18T12:00:00.000Z' }),
      ],
      [],
      'Food',
      { start: new Date(2026, 0, 10), end: new Date(2026, 0, 30, 23, 59, 59, 999) },
      { start: new Date(2025, 11, 20), end: new Date(2026, 0, 9, 23, 59, 59, 999) },
    );

    expect(points).toHaveLength(3);
    expect(points.map((point) => point.name)).toEqual(['Week 1', 'Week 2', 'Week 3']);
    expect(points.map((point) => point.current)).toEqual([10, 20, 0]);
  });

  it('uses the real calendar months contained in longer custom ranges', () => {
    const points = getCategoryComparisonTrend(
      [tx({ amount: 30, type: 'expense', category: 'Food', date: '2026-02-15T12:00:00.000Z' })],
      [],
      'Food',
      { start: new Date(2026, 0, 15), end: new Date(2026, 2, 20, 23, 59, 59, 999) },
      { start: new Date(2025, 10, 10), end: new Date(2026, 0, 14, 23, 59, 59, 999) },
    );

    expect(points).toHaveLength(3);
    expect(points.map((point) => point.name)).toEqual(['Jan 26', 'Feb 26', 'Mar 26']);
    expect(points.map((point) => point.current)).toEqual([0, 30, 0]);
  });
});

// ─── getRecurringDue ────────────────────────────────────────────────

describe('getRecurringDue', () => {
  const today = new Date(2026, 3, 15); // April 15, 2026

  it('generates transaction when bill is due (past due day this month)', () => {
    const bill = recurring({ startDate: '2026-04-05T00:00:00.000Z', dayOfMonth: 5 });
    const result = getRecurringDue([bill], [], today);
    expect(result).toHaveLength(1);
    expect(result[0].transaction.amount).toBe(12.99);
    expect(result[0].transaction.category).toBe('Entertainment');
    expect(result[0].transaction.type).toBe('expense');
    expect(result[0].transaction.sourceRecurringId).toBe('r1');
    expect(result[0].transaction.sourceMonthKey).toBe('2026-04');
  });

  it('backfills monthly recurring transactions from the configured start date through today', () => {
    const bill = recurring({
      startDate: '2026-01-05T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      dayOfMonth: 5,
    });

    const result = getRecurringDue([bill], [], today);

    expect(result.map((entry) => entry.transaction.sourceMonthKey)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
    ]);
  });

  it('does not generate when a tagged recurring transaction already exists this month', () => {
    const bill = recurring();
    const result = getRecurringDue([bill], [{
      id: 'tx-1',
      amount: 12.99,
      type: 'expense',
      category: 'Entertainment',
      date: '2026-04-05T00:00:00.000Z',
      title: 'Netflix',
      description: 'Auto-generated from recurring: Netflix',
      paymentMethod: 'Bank Transfer',
      sourceRecurringId: 'r1',
      sourceMonthKey: '2026-04',
    }], today);
    expect(result).toHaveLength(0);
  });

  it('does not generate when a legacy auto-generated recurring transaction already exists this month', () => {
    const bill = recurring();
    const result = getRecurringDue([bill], [{
      id: 'tx-legacy',
      amount: 12.99,
      type: 'expense',
      category: 'Entertainment',
      date: '2026-04-05T00:00:00.000Z',
      title: 'Netflix',
      description: 'Auto-generated from recurring: Netflix',
      paymentMethod: 'Bank Transfer',
    }], today);
    expect(result).toHaveLength(0);
  });

  it('does not generate when due date is in the future this month', () => {
    const bill = recurring({ startDate: '2026-04-20T00:00:00.000Z', dayOfMonth: 20 });
    const result = getRecurringDue([bill], [], today);
    expect(result).toHaveLength(0);
  });

  it('generates on exact due day', () => {
    const bill = recurring({ startDate: '2026-04-15T00:00:00.000Z', dayOfMonth: 15 });
    const result = getRecurringDue([bill], [], today);
    expect(result).toHaveLength(1);
  });

  it('generates every due weekly occurrence in the current month', () => {
    const bill = recurring({
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-04-30T00:00:00.000Z',
      dayOfMonth: 1,
      frequency: 'weekly',
    });

    const result = getRecurringDue([bill], [], today);
    expect(result.map((entry) => entry.transaction.sourceMonthKey)).toEqual([
      '2026-04-01',
      '2026-04-08',
      '2026-04-15',
    ]);
  });

  it('backfills weekly recurring transactions across months', () => {
    const bill = recurring({
      startDate: '2026-03-25T00:00:00.000Z',
      endDate: '2026-04-30T00:00:00.000Z',
      dayOfMonth: 25,
      frequency: 'weekly',
    });

    const result = getRecurringDue([bill], [], today);

    expect(result.map((entry) => entry.transaction.sourceMonthKey)).toEqual([
      '2026-03-25',
      '2026-04-01',
      '2026-04-08',
      '2026-04-15',
    ]);
  });

  it('dedupes daily recurring transactions by occurrence date', () => {
    const bill = recurring({
      startDate: '2026-04-14T00:00:00.000Z',
      endDate: '2026-04-16T00:00:00.000Z',
      dayOfMonth: 14,
      frequency: 'daily',
    });

    const result = getRecurringDue([bill], [{
      id: 'tx-1',
      amount: 12.99,
      type: 'expense',
      category: 'Entertainment',
      date: '2026-04-14T00:00:00.000Z',
      title: 'Netflix',
      description: 'Auto-generated from recurring: Netflix',
      paymentMethod: 'Bank Transfer',
      sourceRecurringId: 'r1',
      sourceMonthKey: '2026-04-14',
    }], today);

    expect(result.map((entry) => entry.transaction.sourceMonthKey)).toEqual(['2026-04-15']);
  });

  it('generates yearly recurring entries in the matching month only', () => {
    const bill = recurring({
      startDate: '2025-04-15T00:00:00.000Z',
      endDate: '2027-04-15T00:00:00.000Z',
      dayOfMonth: 15,
      frequency: 'yearly',
    });

    const result = getRecurringDue([bill], [], today);
    expect(result.map((entry) => entry.transaction.sourceMonthKey)).toEqual([
      '2025-04-15',
      '2026-04-15',
    ]);
  });

  it('handles multiple bills', () => {
    const bills = [
      recurring({ id: 'r1', startDate: '2026-04-01T00:00:00.000Z', dayOfMonth: 1 }),
      recurring({ id: 'r2', name: 'Spotify', amount: 9.99, startDate: '2026-04-10T00:00:00.000Z', dayOfMonth: 10 }),
      recurring({ id: 'r3', name: 'Gym', amount: 30, startDate: '2026-04-25T00:00:00.000Z', dayOfMonth: 25 }), // future
    ];
    const result = getRecurringDue(bills, [], today);
    expect(result).toHaveLength(2);
  });

  it('backfills due transactions through the configured end date', () => {
    const bill = recurring({
      startDate: '2025-01-05T00:00:00.000Z',
      endDate: '2026-03-05T00:00:00.000Z',
      dayOfMonth: 5,
    });

    expect(getRecurringDue([bill], [], today).map((entry) => entry.transaction.sourceMonthKey)).toEqual([
      '2025-01',
      '2025-02',
      '2025-03',
      '2025-04',
      '2025-05',
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('does not generate before the configured start date', () => {
    const bill = recurring({
      startDate: '2026-04-20T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      dayOfMonth: 20,
    });

    expect(getRecurringDue([bill], [], today)).toHaveLength(0);
  });

  it('applies a monthly override when generating the transaction', () => {
    const bill = recurring({
      overrides: [{
        monthKey: '2026-04',
        amount: 102,
        title: 'Mortgage',
        category: 'Housing',
        description: 'Adjusted installment',
      }],
    });

    const result = getRecurringDue([bill], [], today);
    expect(result).toHaveLength(1);
    expect(result[0].transaction.amount).toBe(102);
    expect(result[0].transaction.title).toBe('Mortgage');
    expect(result[0].transaction.category).toBe('Housing');
    expect(result[0].transaction.recurringEdited).toBe(true);
  });

  it('returns empty when no recurring bills', () => {
    expect(getRecurringDue([], [], today)).toHaveLength(0);
  });
});

// ─── formatMonthLabel ───────────────────────────────────────────────

describe('formatMonthLabel', () => {
  it('formats a date as "Month Year"', () => {
    expect(formatMonthLabel(new Date(2026, 3, 1))).toBe('April 2026');
  });

  it('defaults to current month', () => {
    const result = formatMonthLabel();
    expect(result).toContain(new Date().getFullYear().toString());
  });
});
