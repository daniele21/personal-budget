import { describe, expect, it } from 'vitest';
import {
  INITIAL_APP_DATA,
  isFinancialDataEmpty,
  normalizeAppData,
  syncAppData,
} from '../model';
import { RecurringExpense } from '../../types';

function recurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
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
  };
}

describe('central app data model', () => {
  it('normalizes partial persisted data through one canonical shape', () => {
    const data = normalizeAppData({
      categories: ['Housing'],
      monthlyBudget: 1200,
    });

    expect(data).toEqual({
      ...INITIAL_APP_DATA,
      categories: ['Housing'],
      monthlyBudget: 1200,
    });
  });

  it('generates due recurring transactions while syncing the app data model', () => {
    const data = syncAppData({
      ...INITIAL_APP_DATA,
      recurring: [recurring()],
    }, new Date(2026, 4, 15));

    expect(data.transactions.map((transaction) => transaction.sourceMonthKey)).toEqual([
      '2026-04',
      '2026-05',
    ]);
    expect(data.transactions.every((transaction) => transaction.sourceRecurringId === 'rent')).toBe(true);
  });

  it('checks financial emptiness from the canonical financial collections', () => {
    expect(isFinancialDataEmpty(INITIAL_APP_DATA)).toBe(true);
    expect(isFinancialDataEmpty({
      ...INITIAL_APP_DATA,
      recurring: [recurring()],
    })).toBe(false);
  });
});
