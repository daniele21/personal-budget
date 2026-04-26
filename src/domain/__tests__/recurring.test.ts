import { describe, expect, it } from 'vitest';
import {
  getDefaultRecurringEndDate,
  getRecurringDraftStartDate,
  getRecurringOccurrenceKey,
  getRecurringOccurrencesInMonth,
  reconcileRecurringTransactions,
  isRecurringActiveInMonth,
  normalizeRecurringExpense,
  upsertRecurringOverride,
} from '../recurring';
import { RecurringExpense, Transaction } from '../../types';

describe('recurring domain helpers', () => {
  it('defaults the end date to one year minus one day from the start date', () => {
    expect(getDefaultRecurringEndDate('2026-04-05T00:00:00.000Z')).toBe('2027-04-04T00:00:00.000Z');
  });

  it('derives a recurring draft start date from the visible calendar month', () => {
    expect(getRecurringDraftStartDate(2026, 5, 24)).toBe('2026-06-24');
  });

  it('clamps the recurring draft day when the visible month is shorter', () => {
    expect(getRecurringDraftStartDate(2026, 1, 31)).toBe('2026-02-28');
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
    expect(legacy.frequency).toBe('monthly');
  });

  it('keeps supported recurring frequencies during normalization', () => {
    const weekly = normalizeRecurringExpense({
      id: 'r1',
      name: 'Gym',
      amount: 20,
      startDate: '2026-04-06T00:00:00.000Z',
      endDate: '2026-04-30T00:00:00.000Z',
      dayOfMonth: 6,
      category: 'Health',
      type: 'expense',
      frequency: 'weekly',
    });

    expect(weekly.frequency).toBe('weekly');
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

  it('returns every weekly occurrence in a month on the start weekday', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Gym',
      amount: 20,
      startDate: '2026-04-06T00:00:00.000Z',
      endDate: '2026-04-30T00:00:00.000Z',
      dayOfMonth: 6,
      category: 'Health',
      type: 'expense',
      frequency: 'weekly',
    });

    expect(getRecurringOccurrencesInMonth(recurring, 2026, 3).map((date) => date.toISOString())).toEqual([
      '2026-04-06T00:00:00.000Z',
      '2026-04-13T00:00:00.000Z',
      '2026-04-20T00:00:00.000Z',
      '2026-04-27T00:00:00.000Z',
    ]);
  });

  it('returns daily occurrences inside the active date range', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Coffee',
      amount: 3,
      startDate: '2026-04-29T00:00:00.000Z',
      endDate: '2026-05-02T00:00:00.000Z',
      dayOfMonth: 29,
      category: 'Food',
      type: 'expense',
      frequency: 'daily',
    });

    expect(getRecurringOccurrencesInMonth(recurring, 2026, 3).map((date) => getRecurringOccurrenceKey(recurring, date))).toEqual([
      '2026-04-29',
      '2026-04-30',
    ]);
  });

  it('returns yearly occurrences only in the start month', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Insurance',
      amount: 300,
      startDate: '2026-04-15T00:00:00.000Z',
      endDate: '2028-12-31T00:00:00.000Z',
      dayOfMonth: 15,
      category: 'Insurance',
      type: 'expense',
      frequency: 'yearly',
    });

    expect(getRecurringOccurrencesInMonth(recurring, 2027, 3).map((date) => date.toISOString())).toEqual([
      '2027-04-15T00:00:00.000Z',
    ]);
    expect(getRecurringOccurrencesInMonth(recurring, 2027, 4)).toEqual([]);
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

  it('removes generated transactions that are no longer active after moving the recurring start date', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Mortgage',
      amount: 870,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2028-12-31T00:00:00.000Z',
      dayOfMonth: 1,
      category: 'Housing',
      type: 'expense',
    });

    const transactions: Transaction[] = [{
      id: 'tx-apr',
      amount: 870,
      type: 'expense',
      category: 'Housing',
      date: '2026-04-01T00:00:00.000Z',
      title: 'Mutuo',
      description: 'Auto-generated from recurring: Mutuo',
      paymentMethod: 'Bank Transfer',
      sourceRecurringId: 'r1',
      sourceMonthKey: '2026-04',
    }];

    expect(reconcileRecurringTransactions(transactions, [recurring])).toEqual([]);
  });

  it('realigns linked generated transactions with the recurring source of truth', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Mutuo',
      amount: 870,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2028-12-31T00:00:00.000Z',
      dayOfMonth: 1,
      category: 'Housing',
      type: 'expense',
    });

    const transactions: Transaction[] = [{
      id: 'tx-jun',
      amount: 450,
      type: 'expense',
      category: 'Other',
      date: '2026-06-01T00:00:00.000Z',
      title: 'Old title',
      description: 'stale',
      paymentMethod: 'Cash',
      sourceRecurringId: 'r1',
      sourceMonthKey: '2026-06',
    }];

    expect(reconcileRecurringTransactions(transactions, [recurring])).toEqual([{
      ...transactions[0],
      sourceRecurringId: 'r1',
      sourceMonthKey: '2026-06',
      amount: 870,
      type: 'expense',
      category: 'Housing',
      date: '2026-06-01T00:00:00.000Z',
      title: 'Mutuo',
      description: 'Auto-generated from recurring: Mutuo',
      paymentMethod: 'Bank Transfer',
      recurringEdited: false,
    }]);
  });

  it('migrates legacy auto-generated transactions to linked recurring transactions when the match is unique', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Mutuo',
      amount: 870,
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2028-12-31T00:00:00.000Z',
      dayOfMonth: 1,
      category: 'Housing',
      type: 'expense',
    });

    const transactions: Transaction[] = [{
      id: 'legacy-apr',
      amount: 870,
      type: 'expense',
      category: 'Housing',
      date: '2026-04-01T00:00:00.000Z',
      title: 'Mutuo',
      description: 'Auto-generated from recurring: Mutuo',
      paymentMethod: 'Bank Transfer',
    }];

    expect(reconcileRecurringTransactions(transactions, [recurring])).toEqual([{
      ...transactions[0],
      sourceRecurringId: 'r1',
      sourceMonthKey: '2026-04',
      recurringEdited: false,
    }]);
  });

  it('removes legacy auto-generated transactions when the matched recurring is no longer active in that month', () => {
    const recurring = normalizeRecurringExpense({
      id: 'r1',
      name: 'Mutuo',
      amount: 870,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2028-12-31T00:00:00.000Z',
      dayOfMonth: 1,
      category: 'Housing',
      type: 'expense',
    });

    const transactions: Transaction[] = [{
      id: 'legacy-apr',
      amount: 870,
      type: 'expense',
      category: 'Housing',
      date: '2026-04-01T00:00:00.000Z',
      title: 'Mutuo',
      description: 'Auto-generated from recurring: Mutuo',
      paymentMethod: 'Bank Transfer',
    }];

    expect(reconcileRecurringTransactions(transactions, [recurring])).toEqual([]);
  });
});
