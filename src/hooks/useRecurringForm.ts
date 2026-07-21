import { useState } from 'react';
import type { RecurringExpense } from '../types';
import {
  buildRecurringItem,
  createRecurringFormDraft,
  createRecurringFormDraftFromItem,
  type RecurringFormDraft,
  type RecurringFormError,
} from '../domain/recurringForm';

interface UseRecurringFormOptions {
  defaultStartDate: string;
  defaultCategory: string;
}

export function useRecurringForm({ defaultStartDate, defaultCategory }: UseRecurringFormOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecurringFormDraft>(() => createRecurringFormDraft(defaultStartDate, defaultCategory));

  const setField = <Key extends keyof RecurringFormDraft>(key: Key, value: RecurringFormDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setIsOpen(false);
    setEditingId(null);
    setDraft(createRecurringFormDraft(defaultStartDate, defaultCategory));
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(createRecurringFormDraft(defaultStartDate, defaultCategory));
    setIsOpen(true);
  };

  const openEdit = (item: RecurringExpense) => {
    setEditingId(item.id);
    setDraft(createRecurringFormDraftFromItem(item));
    setIsOpen(true);
  };

  const build = (items: RecurringExpense[]): { item: RecurringExpense; error?: never } | { item?: never; error: RecurringFormError } => (
    buildRecurringItem(draft, editingId, items)
  );

  return { isOpen, editingId, draft, setField, reset, openCreate, openEdit, build };
}
