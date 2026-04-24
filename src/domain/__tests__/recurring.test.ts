import { describe, expect, it } from 'vitest';
import {
  getDefaultRecurringEndDate,
  isRecurringActiveInMonth,
  normalizeRecurringExpense,
  upsertRecurringOverride,
} from '../recurring';
import { RecurringExpense } from '../../types';

describe('recurring domain helpers', () => {
  it('defaults the end date to one year minus one day from the start date', () => {
    expect(getDefaultRecurringEndDate('2026-04-05T00:00:00.000Z')).toBe('2027-04-04T00:00:00.000Z');
  });

  it('normalizes legacy recurring entries with dueDate only', () => {
    const legacy = normalizeRecurringExpense({
      id: 'r1',
      name: 'Mortgage',
      amount: 100,
      dueDate: '2026-04-05T00:00:00.000Z',
      category: 'Housing',
    } as RecurringExpense);

    expect(legacy.startDate).toBe('2026-04-05T00:00:00.000Z');
    expect(legacy.endDate).toBe('2027-04-04T00:00:00.000Z');
    expect(legacy.dayOfMonth).toBe(5);
    expect(legacy.type).toBe('expense');
  });

  it('detects whether a recurring item is active in a given month', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Mortgage',
      amount: 100,
      startDate: '2026-04-05T00:00:00.000Z',
      endDate: '2026-06-05T00:00:00.000Z',
      dayOfMonth: 5,
      category: 'Housing',
      type: 'expense',
    });

    expect(isRecurringActiveInMonth(recurring, 2026, 3)).toBe(true);
    expect(isRecurringActiveInMonth(recurring, 2026, 4)).toBe(true);
    expect(isRecurringActiveInMonth(recurring, 2026, 6)).toBe(false);
  });

  it('upserts an override by month key', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Mortgage',
      amount: 100,
      startDate: '2026-04-05T00:00:00.000Z',
      endDate: '2027-04-04T00:00:00.000Z',
      dayOfMonth: 5,
      category: 'Housing',
      type: 'expense',
      overrides: [{ monthKey: '2026-04', amount: 100 }],
    });

    const updated = upsertRecurringOverride(recurring, { monthKey: '2026-04', amount: 102 });
    expect(updated.overrides).toEqual([{ monthKey: '2026-04', amount: 102 }]);
  });
});
