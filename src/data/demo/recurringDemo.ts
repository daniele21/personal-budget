import { RecurringExpense } from '../../types';

function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/**
 * Builds demo recurring expenses & subscriptions with multiple frequencies,
 * priority flags, custom lead-time reminders, and month overrides.
 */
export function buildDemoRecurring(year: number, month: number): RecurringExpense[] {
  const startDate = isoDate(year - 1, month, 1);
  const endDate = isoDate(year + 2, month, 1);

  const prevMonthKey = new Date(year, month - 1, 1).toISOString().slice(0, 7);
  const twoMonthsAgoKey = new Date(year, month - 2, 1).toISOString().slice(0, 7);

  return [
    {
      id: 'demo-rec-rent',
      name: 'Affitto Casa',
      amount: 1050,
      startDate,
      endDate,
      dayOfMonth: 2,
      category: 'Housing',
      type: 'expense',
      frequency: 'monthly',
      priority: true,
      reminder: { enabled: true, leadDays: 3 },
    },
    {
      id: 'demo-rec-streaming',
      name: 'Netflix & Spotify Duo',
      amount: 22.99,
      startDate,
      endDate,
      dayOfMonth: 10,
      category: 'Entertainment',
      type: 'expense',
      frequency: 'monthly',
      priority: false,
      reminder: { enabled: true, leadDays: 1 },
      overrides: [
        {
          monthKey: prevMonthKey,
          amount: 29.99,
          description: 'Abbonamento 4K Ultra incluso per 1 mese',
        },
      ],
    },
    {
      id: 'demo-rec-gym',
      name: 'Abbonamento Palestra',
      amount: 55,
      startDate,
      endDate,
      dayOfMonth: 5,
      category: 'Health',
      type: 'expense',
      frequency: 'monthly',
      priority: true,
      reminder: { enabled: true, leadDays: 2 },
      overrides: [
        {
          monthKey: twoMonthsAgoKey,
          skipped: true,
        },
      ],
    },
    {
      id: 'demo-rec-fiber',
      name: 'Fibra & Internet Casa',
      amount: 34.9,
      startDate,
      endDate,
      dayOfMonth: 15,
      category: 'Utilities',
      type: 'expense',
      frequency: 'monthly',
      priority: true,
      reminder: { enabled: true, leadDays: 2 },
    },
    {
      id: 'demo-rec-groceries-weekly',
      name: 'Spesa Biologica Settimanale',
      amount: 45,
      startDate,
      endDate,
      dayOfMonth: 4,
      category: 'Groceries',
      type: 'expense',
      frequency: 'weekly',
      priority: false,
      reminder: { enabled: false, leadDays: 1 },
    },
    {
      id: 'demo-rec-cloud-yearly',
      name: 'iCloud & Domain Storage',
      amount: 99.99,
      startDate,
      endDate,
      dayOfMonth: 28,
      category: 'Utilities',
      type: 'expense',
      frequency: 'yearly',
      priority: false,
      reminder: { enabled: true, leadDays: 5 },
    },
  ];
}
