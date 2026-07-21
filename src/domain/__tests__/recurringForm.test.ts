import { describe, expect, it } from 'vitest';
import type { RecurringExpense } from '../../types';
import {
  buildRecurringItem,
  createRecurringFormDraft,
  createRecurringFormDraftFromItem,
  saveRecurringItem,
} from '../recurringForm';

const existingItem: RecurringExpense = {
  id: 'rent',
  name: 'Rent',
  amount: 900,
  startDate: '2026-07-01T00:00:00.000Z',
  endDate: '2027-06-30T00:00:00.000Z',
  dayOfMonth: 1,
  category: 'Housing',
  type: 'expense',
  frequency: 'monthly',
  priority: true,
  reminder: { enabled: true, leadDays: 3 },
  overrides: [{ monthKey: '2026-08', amount: 950 }],
};

describe('recurring form domain', () => {
  it('builds the same normalized recurring item for every planning entry point', () => {
    const draft = {
      ...createRecurringFormDraft('2026-07-15', 'Income'),
      name: ' Salary ',
      amount: '2400',
      type: 'income' as const,
      frequency: 'monthly' as const,
      reminderEnabled: true,
      reminderLeadDays: 1,
    };

    const result = buildRecurringItem(draft, null, [], () => 'salary');

    expect(result).toEqual({
      item: expect.objectContaining({
        id: 'salary',
        name: 'Salary',
        amount: 2400,
        startDate: '2026-07-15T00:00:00.000Z',
        endDate: '2027-07-14T00:00:00.000Z',
        dayOfMonth: 15,
        type: 'income',
        priority: false,
        reminder: { enabled: true, leadDays: 1 },
      }),
    });
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ amount: '0' }, 'amount'],
    [{ startDate: '' }, 'startDate'],
    [{ startDate: '2026-08-01', endDate: '2026-07-31' }, 'dateRange'],
  ] as const)('returns a stable validation error for %o', (change, error) => {
    const draft = { ...createRecurringFormDraft('2026-07-01', 'Housing'), name: 'Rent', amount: '900', ...change };
    expect(buildRecurringItem(draft, null, [])).toEqual({ error });
  });

  it('hydrates edits and preserves occurrence overrides when saving', () => {
    const draft = { ...createRecurringFormDraftFromItem(existingItem), amount: '925' };
    const result = buildRecurringItem(draft, existingItem.id, [existingItem]);
    if (!result.item) throw new Error('Expected a valid recurring item');

    const saved = saveRecurringItem([existingItem], result.item, existingItem.id);

    expect(saved).toHaveLength(1);
    expect(saved[0].amount).toBe(925);
    expect(saved[0].overrides).toEqual(existingItem.overrides);
    expect(draft.reminderLeadDays).toBe(3);
  });
});
