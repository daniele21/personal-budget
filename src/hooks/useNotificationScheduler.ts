import { useEffect } from 'react';
import { STORAGE_KEYS } from '../data/storageKeys';
import { BudgetStatus } from '../domain/finance';
import { getRecurringReminderCandidates } from '../domain/recurring';
import { RecurringExpense, Transaction } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { useNotifications } from './useNotifications';

interface SchedulerInput {
  transactions: Transaction[];
  recurring: RecurringExpense[];
  budgetStatuses: BudgetStatus[];
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function daysUntil(date: Date, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((target - start) / 86_400_000);
}

function hasRecordedRecurringOccurrence(
  transactions: Transaction[],
  recurringId: string,
  occurrenceKey: string,
): boolean {
  return transactions.some((transaction) => (
    transaction.sourceRecurringId === recurringId &&
    transaction.sourceMonthKey === occurrenceKey
  ));
}

export function useNotificationScheduler({ transactions, recurring, budgetStatuses }: SchedulerInput) {
  const notifications = useNotifications();
  const [lastCheck, setLastCheck] = useLocalStorage<string | null>(STORAGE_KEYS.lastNotificationCheck, null);

  useEffect(() => {
    if (!notifications.preferences.enabled) return;
    const today = new Date();
    const todayKey = dateKey(today);
    if (lastCheck === todayKey) return;

    const existingKeys = new Set(notifications.records.map((record) => record.dedupeKey).filter(Boolean));

    const emit = async (record: { title: string; body: string; type: 'budget' | 'recurring' | 'reminder'; route: string; dedupeKey: string }) => {
      if (existingKeys.has(record.dedupeKey)) return;
      const created = notifications.addRecord(record);
      existingKeys.add(record.dedupeKey);
      await notifications.notifyNative(created);
    };

    if (notifications.preferences.budgetAlerts) {
      budgetStatuses
        .filter((budget) => budget.status === 'warning' || budget.status === 'exceeded')
        .forEach((budget) => {
          emit({
            title: budget.status === 'exceeded' ? `${budget.category} budget exceeded` : `${budget.category} budget warning`,
            body: `${Math.round(budget.percent)}% of the monthly budget has been used.`,
            type: 'budget',
            route: '/budgets',
            dedupeKey: `budget:${todayKey}:${budget.category}:${budget.status}`,
          });
        });
    }

    if (notifications.preferences.recurringReminders) {
      getRecurringReminderCandidates(recurring, today)
        .filter(({ bill, occurrenceKey }) => !hasRecordedRecurringOccurrence(transactions, bill.id, occurrenceKey))
        .forEach(({ bill, daysUntilDue, occurrenceKey }) => {
          const body = daysUntilDue === 0
            ? `${bill.category} recurring item is due today.`
            : `${bill.category} recurring item is due in ${daysUntilDue} day(s).`;

          emit({
            title: `${bill.name} reminder`,
            body,
            type: 'recurring',
            route: '/recurring',
            dedupeKey: `recurring:${todayKey}:${bill.id}:${occurrenceKey}`,
          });
        });
    }

    if (notifications.preferences.customReminders) {
      notifications.reminders
        .filter((reminder) => !reminder.completed)
        .forEach((reminder) => {
          const remainingDays = daysUntil(new Date(reminder.date), today);
          if (remainingDays < 0 || remainingDays > notifications.preferences.reminderLeadDays) return;
          emit({
            title: reminder.title,
            body: reminder.note || (remainingDays === 0 ? 'Reminder due today.' : `Reminder due in ${remainingDays} day(s).`),
            type: 'reminder',
            route: '/profile',
            dedupeKey: `reminder:${todayKey}:${reminder.id}`,
          });
        });
    }

    setLastCheck(todayKey);
  }, [budgetStatuses, lastCheck, notifications, recurring, setLastCheck, transactions]);
}
