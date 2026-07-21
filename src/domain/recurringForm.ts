import type { RecurringExpense, RecurringFrequency, TransactionType } from '../types';
import { getDefaultRecurringEndDate, getRecurringReminderSettings, getUtcDateInputValue, getUtcDayOfMonth } from './recurring';

export interface RecurringFormDraft {
  name: string;
  amount: string;
  startDate: string;
  endDate: string;
  category: string;
  type: TransactionType;
  frequency: RecurringFrequency;
  reminderEnabled: boolean;
  reminderLeadDays: number;
}

export type RecurringFormError = 'name' | 'amount' | 'startDate' | 'dateRange';

export function createRecurringFormDraft(startDate: string, category: string): RecurringFormDraft {
  return {
    name: '',
    amount: '',
    startDate,
    endDate: '',
    category,
    type: 'expense',
    frequency: 'monthly',
    reminderEnabled: false,
    reminderLeadDays: 1,
  };
}

export function createRecurringFormDraftFromItem(item: RecurringExpense): RecurringFormDraft {
  const reminder = getRecurringReminderSettings(item);
  return {
    name: item.name,
    amount: item.amount.toString(),
    startDate: getUtcDateInputValue(item.startDate),
    endDate: getUtcDateInputValue(item.endDate),
    category: item.category,
    type: item.type ?? 'expense',
    frequency: item.frequency ?? 'monthly',
    reminderEnabled: reminder.enabled,
    reminderLeadDays: reminder.leadDays,
  };
}

export function buildRecurringItem(
  draft: RecurringFormDraft,
  editingId: string | null,
  existingItems: RecurringExpense[],
  createId: () => string = () => Math.random().toString(36).slice(2, 11),
): { item: RecurringExpense; error?: never } | { item?: never; error: RecurringFormError } {
  const name = draft.name.trim();
  if (!name) return { error: 'name' };

  const amount = Number.parseFloat(draft.amount);
  if (!draft.amount || Number.isNaN(amount) || amount <= 0) return { error: 'amount' };
  if (!draft.startDate) return { error: 'startDate' };

  const startDate = new Date(`${draft.startDate}T00:00:00.000Z`).toISOString();
  const endDate = draft.endDate
    ? new Date(`${draft.endDate}T00:00:00.000Z`).toISOString()
    : getDefaultRecurringEndDate(startDate);
  if (new Date(endDate) < new Date(startDate)) return { error: 'dateRange' };

  return {
    item: {
      id: editingId ?? createId(),
      name,
      amount,
      startDate,
      endDate,
      dayOfMonth: getUtcDayOfMonth(startDate),
      category: draft.category,
      type: draft.type,
      frequency: draft.frequency,
      priority: draft.type === 'expense',
      reminder: { enabled: draft.reminderEnabled, leadDays: draft.reminderLeadDays },
      overrides: editingId
        ? existingItems.find((item) => item.id === editingId)?.overrides ?? []
        : [],
    },
  };
}

export function saveRecurringItem(items: RecurringExpense[], item: RecurringExpense, editingId: string | null) {
  return editingId
    ? items.map((existing) => (existing.id === editingId ? item : existing))
    : [...items, item];
}
