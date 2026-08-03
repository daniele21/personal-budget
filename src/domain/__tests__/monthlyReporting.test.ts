import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../types';
import {
  createCalendarMonthWindows,
  getCategoryReport,
  getCategorySpendingSummaries,
  getSpendingPaceReport,
} from '../monthlyReporting';

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'date'>): Transaction {
  return {
    type: 'expense',
    category: 'Food',
    title: 'Transaction',
    description: '',
    paymentMethod: 'Card',
    ...overrides,
  };
}

describe('calendar month reporting', () => {
  it('distinguishes complete calendar months from partial boundaries and the current month', () => {
    const windows = createCalendarMonthWindows(
      new Date(2026, 0, 15),
      new Date(2026, 2, 20, 23, 59, 59, 999),
      new Date(2026, 2, 20),
    );

    expect(windows.map((window) => ({
      key: window.key,
      complete: window.isComplete,
    }))).toEqual([
      { key: '2026-01', complete: false },
      { key: '2026-02', complete: true },
      { key: '2026-03', complete: false },
    ]);
  });

  it('handles leap-year February as a complete calendar month', () => {
    const windows = createCalendarMonthWindows(
      new Date(2028, 1, 1),
      new Date(2028, 1, 29, 23, 59, 59, 999),
      new Date(2028, 2, 1),
    );

    expect(windows).toHaveLength(1);
    expect(windows[0].isComplete).toBe(true);
    expect(windows[0].end.getDate()).toBe(29);
  });

  it('creates stable keys across a year boundary', () => {
    const windows = createCalendarMonthWindows(
      new Date(2025, 11, 1),
      new Date(2026, 0, 31, 23, 59, 59, 999),
      new Date(2026, 1, 1),
    );

    expect(windows.map((window) => window.key)).toEqual(['2025-12', '2026-01']);
    expect(windows.every((window) => window.isComplete)).toBe(true);
  });
});

describe('category monthly reporting', () => {
  const now = new Date(2026, 2, 20);
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 2, 20, 23, 59, 59, 999);
  const transactions = [
    tx({ id: 'jan-food', amount: 100, date: new Date(2026, 0, 5, 12).toISOString() }),
    tx({ id: 'feb-food', amount: 300, date: new Date(2026, 1, 5, 12).toISOString() }),
    tx({ id: 'mar-food', amount: 200, date: new Date(2026, 2, 5, 12).toISOString() }),
    tx({ id: 'mar-home', amount: 400, category: 'Home', date: new Date(2026, 2, 6, 12).toISOString() }),
  ];

  it('keeps partial months in totals but excludes them from monthly averages', () => {
    const summaries = getCategorySpendingSummaries(transactions, start, end, 'actual', now);
    const food = summaries.find((summary) => summary.category === 'Food');

    expect(food).toMatchObject({
      selectedTotal: 600,
      monthlyAverage: 200,
      completeMonthCount: 2,
    });
  });

  it('builds a month plot and ranks the highest-impact transactions', () => {
    const report = getCategoryReport(transactions, 'Food', start, end, 'actual', now, 2);

    expect(report.monthlyPoints).toEqual([
      { key: '2026-01', label: 'Jan 26', amount: 100, isPartial: false },
      { key: '2026-02', label: 'Feb 26', amount: 300, isPartial: false },
      { key: '2026-03', label: 'Mar 26', amount: 200, isPartial: true },
    ]);
    expect(report.topTransactions.map((transaction) => transaction.id)).toEqual(['feb-food', 'mar-food']);
  });

  it('applies reimbursements and analytics lenses before aggregation', () => {
    const mixed = [
      tx({ id: 'regular', amount: 200, date: new Date(2026, 0, 5, 12).toISOString() }),
      tx({
        id: 'refund',
        amount: 50,
        type: 'income',
        reportingClass: 'reimbursement',
        date: new Date(2026, 0, 8, 12).toISOString(),
      }),
      tx({
        id: 'extra',
        amount: 500,
        reportingClass: 'extra',
        date: new Date(2026, 1, 5, 12).toISOString(),
      }),
    ];

    expect(getCategoryReport(mixed, 'Food', start, end, 'actual', now).selectedTotal).toBe(650);
    expect(getCategoryReport(mixed, 'Food', start, end, 'normalized', now).selectedTotal).toBe(150);
    expect(getCategoryReport(mixed, 'Food', start, end, 'extras', now).selectedTotal).toBe(500);
  });

  it('floors an over-reimbursed month at zero', () => {
    const report = getCategoryReport([
      tx({ id: 'expense', amount: 100, date: new Date(2026, 0, 5, 12).toISOString() }),
      tx({
        id: 'refund',
        amount: 150,
        type: 'income',
        reportingClass: 'reimbursement',
        date: new Date(2026, 0, 8, 12).toISOString(),
      }),
    ], 'Food', start, end, 'actual', now);

    expect(report.selectedTotal).toBe(0);
    expect(report.monthlyPoints[0].amount).toBe(0);
  });

  it('omits the average until two complete months are available', () => {
    const report = getCategoryReport(
      [tx({ id: 'single', amount: 100, date: new Date(2026, 1, 5, 12).toISOString() })],
      'Food',
      new Date(2026, 1, 1),
      new Date(2026, 1, 28, 23, 59, 59, 999),
      'actual',
      now,
    );

    expect(report.completeMonthCount).toBe(1);
    expect(report.monthlyAverage).toBeNull();
  });

  it('keeps archived category names reportable from transaction history', () => {
    const report = getCategoryReport(
      [tx({ id: 'archived', amount: 90, category: 'Old category', date: new Date(2026, 0, 3, 12).toISOString() })],
      'Old category',
      start,
      end,
      'actual',
      now,
    );

    expect(report.selectedTotal).toBe(90);
  });
});

describe('calendar-month spending pace', () => {
  const now = new Date(2026, 3, 15);
  const start = new Date(2026, 0, 1);
  const end = new Date(2026, 2, 31, 23, 59, 59, 999);

  it('uses complete months and derives every displayed unit from one baseline', () => {
    const report = getSpendingPaceReport([
      tx({ id: 'jan', amount: 300, date: new Date(2026, 0, 3, 12).toISOString() }),
      tx({ id: 'mar', amount: 600, date: new Date(2026, 2, 28, 12).toISOString() }),
    ], start, end, 'actual', now);

    expect(report.points.map((point) => ({
      key: point.key,
      actual: point.actual,
      pace: point.pace,
      months: point.baselineMonthCount,
    }))).toEqual([
      { key: '2026-01', actual: 300, pace: 300, months: 1 },
      { key: '2026-02', actual: 0, pace: 150, months: 2 },
      { key: '2026-03', actual: 600, pace: 300, months: 3 },
    ]);
    expect(report.monthlyPace).toBe(300);
    expect(report.dailyEquivalent).toBeCloseTo(300 * 12 / 365.2425);
    expect(report.weeklyEquivalent).toBeCloseTo((300 * 12 / 365.2425) * 7);
  });

  it('is insensitive to the posting day within the same calendar month', () => {
    const early = getSpendingPaceReport([
      tx({ id: 'rent', amount: 900, date: new Date(2026, 2, 1, 8).toISOString() }),
    ], start, end, 'actual', now);
    const late = getSpendingPaceReport([
      tx({ id: 'rent', amount: 900, date: new Date(2026, 2, 28, 8).toISOString() }),
    ], start, end, 'actual', now);

    expect(early.monthlyPace).toBe(late.monthlyPace);
  });

  it('does not invent complete history before the first ledger month', () => {
    const report = getSpendingPaceReport([
      tx({ id: 'current', amount: 100, date: new Date(2026, 3, 2, 12).toISOString() }),
    ], start, end, 'actual', now);

    expect(report.points).toEqual([]);
    expect(report.monthlyPace).toBeNull();
    expect(report.baselineMonthCount).toBe(0);
  });

  it('excludes partial custom boundary months', () => {
    const report = getSpendingPaceReport([
      tx({ id: 'jan', amount: 100, date: new Date(2026, 0, 20, 12).toISOString() }),
      tx({ id: 'feb', amount: 200, date: new Date(2026, 1, 10, 12).toISOString() }),
      tx({ id: 'mar', amount: 300, date: new Date(2026, 2, 10, 12).toISOString() }),
    ], new Date(2026, 0, 15), new Date(2026, 2, 20, 23, 59, 59, 999), 'actual', now);

    expect(report.points.map((point) => point.key)).toEqual(['2026-02']);
  });

  it('uses reimbursement-aware lens totals for pace', () => {
    const mixed = [
      tx({ id: 'regular', amount: 300, date: new Date(2026, 0, 5, 12).toISOString() }),
      tx({
        id: 'refund',
        amount: 50,
        type: 'income',
        reportingClass: 'reimbursement',
        date: new Date(2026, 0, 8, 12).toISOString(),
      }),
      tx({
        id: 'extra',
        amount: 500,
        reportingClass: 'extra',
        date: new Date(2026, 0, 10, 12).toISOString(),
      }),
    ];
    const januaryStart = new Date(2026, 0, 1);
    const januaryEnd = new Date(2026, 0, 31, 23, 59, 59, 999);
    const february = new Date(2026, 1, 2);

    expect(getSpendingPaceReport(mixed, januaryStart, januaryEnd, 'actual', february).monthlyPace).toBe(750);
    expect(getSpendingPaceReport(mixed, januaryStart, januaryEnd, 'normalized', february).monthlyPace).toBe(250);
    expect(getSpendingPaceReport(mixed, januaryStart, januaryEnd, 'extras', february).monthlyPace).toBe(500);
  });
});
