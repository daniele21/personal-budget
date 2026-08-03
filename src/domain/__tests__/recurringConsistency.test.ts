import { describe, expect, it } from 'vitest';
import {
  analyzeBudgets,
  calculateTotals,
  comparePeriods,
  createMonthRange,
  filterByMonth,
  getAnnualReview,
  spendingByCategory,
  syncRecurringTransactions,
} from '../finance';
import { normalizeRecurringExpense, reconcileRecurringTransactions } from '../recurring';
import { Budget, RecurringExpense, Transaction } from '../../types';

function recurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return normalizeRecurringExpense({
    id: 'rent',
    name: 'Rent',
    amount: 900,
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    dayOfMonth: 1,
    category: 'Housing',
    type: 'expense',
    frequency: 'monthly',
    ...overrides,
  });
}

function generatedTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-rec-2026-04',
    amount: 900,
    type: 'expense',
    category: 'Housing',
    date: '2026-04-01T00:00:00.000Z',
    title: 'Rent',
    description: 'Auto-generated from recurring: Rent',
    paymentMethod: 'Bank Transfer',
    sourceRecurringId: 'rent',
    sourceMonthKey: '2026-04',
    recurringEdited: false,
    ...overrides,
  };
}

function budget(category: string, limit: number): Budget {
  return { category, limit, spent: 0, currency: 'EUR' };
}

describe('recurring consistency across history and derived finance views', () => {
  it('propagates a whole-series recurring update to generated history, budgets, and reports', () => {
    const updatedRecurring = recurring({
      name: 'Home Rent',
      amount: 950,
      category: 'Housing',
    });
    const existingTransactions: Transaction[] = [
      generatedTransaction(),
      generatedTransaction({
        id: 'tx-rec-2026-05',
        date: '2026-05-01T00:00:00.000Z',
        sourceMonthKey: '2026-05',
      }),
      {
        id: 'manual-groceries',
        amount: 40,
        type: 'expense',
        category: 'Groceries',
        date: '2026-04-10T00:00:00.000Z',
        title: 'Groceries',
        description: 'Manual transaction',
        paymentMethod: 'Card',
      },
    ];

    const reconciled = reconcileRecurringTransactions(existingTransactions, [updatedRecurring]);

    expect(reconciled).toEqual([
      {
        ...existingTransactions[0],
        amount: 950,
        category: 'Housing',
        title: 'Home Rent',
        description: 'Auto-generated from recurring: Home Rent',
        paymentMethod: 'Bank Transfer',
        recurringEdited: false,
      },
      {
        ...existingTransactions[1],
        amount: 950,
        category: 'Housing',
        title: 'Home Rent',
        description: 'Auto-generated from recurring: Home Rent',
        paymentMethod: 'Bank Transfer',
        recurringEdited: false,
      },
      existingTransactions[2],
    ]);

    const aprilTransactions = filterByMonth(reconciled, new Date(2026, 3, 15));
    expect(calculateTotals(aprilTransactions).expenses).toBe(990);
    expect(analyzeBudgets([budget('Housing', 1_000), budget('Groceries', 100)], aprilTransactions)).toMatchObject([
      { category: 'Housing', spent: 950, remaining: 50, status: 'warning' },
      { category: 'Groceries', spent: 40, remaining: 60, status: 'ok' },
    ]);
    expect(spendingByCategory(aprilTransactions).map((item) => [item.category, item.amount])).toEqual([
      ['Housing', 950],
      ['Groceries', 40],
    ]);

    const comparison = comparePeriods(
      reconciled,
      createMonthRange(2026, 3),
      createMonthRange(2026, 4),
    );
    expect(comparison.totalsA.expenses).toBe(990);
    expect(comparison.totalsB.expenses).toBe(950);

    const annualReview = getAnnualReview(reconciled, 2026);
    expect(annualReview.totals.expenses).toBe(1_940);
    expect(annualReview.topCategories[0]).toMatchObject({ category: 'Housing', amount: 1_900 });
  });

  it('keeps occurrence-level overrides stable while syncing the rest of the series', () => {
    const updatedRecurring = recurring({
      name: 'Home Rent',
      amount: 950,
      category: 'Housing',
      overrides: [{
        monthKey: '2026-05',
        occurrenceKey: '2026-05',
        amount: 1_025,
        title: 'Rent adjustment',
        category: 'Maintenance',
        description: 'One-off adjustment',
        paymentMethod: 'Card',
      }],
    });
    const existingTransactions: Transaction[] = [
      generatedTransaction(),
      generatedTransaction({
        id: 'tx-rec-2026-05',
        amount: 1_025,
        category: 'Maintenance',
        date: '2026-05-01T00:00:00.000Z',
        title: 'Rent adjustment',
        description: 'One-off adjustment',
        paymentMethod: 'Card',
        sourceMonthKey: '2026-05',
        recurringEdited: true,
      }),
    ];

    const reconciled = reconcileRecurringTransactions(existingTransactions, [updatedRecurring]);

    expect(reconciled[0]).toMatchObject({
      amount: 950,
      category: 'Housing',
      title: 'Home Rent',
      recurringEdited: false,
    });
    expect(reconciled[1]).toMatchObject({
      amount: 1_025,
      category: 'Maintenance',
      title: 'Rent adjustment',
      description: 'One-off adjustment',
      paymentMethod: 'Card',
      recurringEdited: true,
    });

    const annualReview = getAnnualReview(reconciled, 2026);
    expect(annualReview.totals.expenses).toBe(1_975);
    expect(annualReview.topCategories.map((item) => [item.category, item.amount])).toEqual([
      ['Maintenance', 1_025],
      ['Housing', 950],
    ]);
  });

  it('removes generated history from derived views when a recurring update makes an occurrence inactive', () => {
    const updatedRecurring = recurring({
      startDate: '2026-05-01T00:00:00.000Z',
    });
    const existingTransactions: Transaction[] = [
      generatedTransaction(),
      generatedTransaction({
        id: 'tx-rec-2026-05',
        date: '2026-05-01T00:00:00.000Z',
        sourceMonthKey: '2026-05',
      }),
    ];

    const reconciled = reconcileRecurringTransactions(existingTransactions, [updatedRecurring]);

    expect(reconciled.map((transaction) => transaction.sourceMonthKey)).toEqual(['2026-05']);
    expect(calculateTotals(filterByMonth(reconciled, new Date(2026, 3, 15))).expenses).toBe(0);
    expect(calculateTotals(filterByMonth(reconciled, new Date(2026, 4, 15))).expenses).toBe(900);
    expect(getAnnualReview(reconciled, 2026).totals.expenses).toBe(900);
  });

  it('creates missing due transactions from the same canonical sync used by app data', () => {
    const updatedRecurring = recurring({
      amount: 950,
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
    });
    const existingTransactions: Transaction[] = [{
      id: 'manual-groceries',
      amount: 40,
      type: 'expense',
      category: 'Groceries',
      date: '2026-04-10T00:00:00.000Z',
      title: 'Groceries',
      description: 'Manual transaction',
      paymentMethod: 'Card',
    }];

    const synced = syncRecurringTransactions(
      [updatedRecurring],
      existingTransactions,
      new Date(2026, 4, 15),
    );

    expect(synced.map((transaction) => transaction.sourceMonthKey).filter(Boolean)).toEqual([
      '2026-04',
      '2026-05',
    ]);
    expect(calculateTotals(filterByMonth(synced, new Date(2026, 3, 15))).expenses).toBe(990);
    expect(calculateTotals(filterByMonth(synced, new Date(2026, 4, 15))).expenses).toBe(950);
    expect(getAnnualReview(synced, 2026).totals.expenses).toBe(1_940);
  });

  it('uses stable IDs for new occurrences while preserving historical linked IDs', () => {
    const bill = recurring({
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-04-30T00:00:00.000Z',
    });

    const first = syncRecurringTransactions([bill], [], new Date(2026, 3, 15));
    const second = syncRecurringTransactions([bill], [], new Date(2026, 3, 15));

    expect(first[0].id).toBe('rec_rent_2026-04');
    expect(second[0].id).toBe(first[0].id);

    const historical = { ...first[0], id: 'rec_rent_2026-04_legacy' };
    const reconciled = syncRecurringTransactions([bill], [historical], new Date(2026, 3, 15));

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].id).toBe('rec_rent_2026-04_legacy');
  });

  it('resolves a deterministic recurring ID collision without replacing the existing row', () => {
    const bill = recurring({
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-04-30T00:00:00.000Z',
    });
    const unrelated = generatedTransaction({
      id: 'rec_rent_2026-04',
      sourceRecurringId: undefined,
      sourceMonthKey: undefined,
      title: 'Manual collision',
      description: 'Manual transaction',
    });

    const synced = syncRecurringTransactions([bill], [unrelated], new Date(2026, 3, 15));

    expect(synced.map((transaction) => transaction.id)).toEqual([
      'rec_rent_2026-04_2',
      'rec_rent_2026-04',
    ]);
  });
});
