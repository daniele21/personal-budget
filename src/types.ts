export type TransactionType = 'expense' | 'income';
export type TransactionReportingClass = 'regular' | 'extra';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  title: string;
  description: string;
  paymentMethod: string;
  attachmentUrl?: string;
  verified?: boolean;
  sourceRecurringId?: string;
  sourceMonthKey?: string;
  recurringEdited?: boolean;
  reportingClass?: TransactionReportingClass;
  reportingNote?: string;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
  currency: string;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  lastFour: string;
  balance: number;
  type: 'checking' | 'savings' | 'credit' | 'cash';
  apy?: string;
  status?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
}

export interface RecurringOverride {
  monthKey: string;
  occurrenceKey?: string;
  amount?: number;
  type?: TransactionType;
  category?: string;
  title?: string;
  description?: string;
  paymentMethod?: string;
  date?: string;
  skipped?: boolean;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringReminderSettings {
  enabled: boolean;
  leadDays: number;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  startDate: string;
  endDate: string;
  dayOfMonth: number;
  category: string;
  type?: TransactionType;
  frequency?: RecurringFrequency;
  priority?: boolean;
  reminder?: RecurringReminderSettings;
  overrides?: RecurringOverride[];
  dueDate?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  budgetAlerts: boolean;
  recurringReminders: boolean;
  customReminders: boolean;
  reminderLeadDays: number;
}

export interface CustomReminder {
  id: string;
  title: string;
  date: string;
  note?: string;
  completed?: boolean;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: 'budget' | 'recurring' | 'reminder' | 'system';
  route: string;
  createdAt: string;
  read: boolean;
  dedupeKey?: string;
}
