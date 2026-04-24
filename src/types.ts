export type TransactionType = 'expense' | 'income';

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
  amount?: number;
  type?: TransactionType;
  category?: string;
  title?: string;
  description?: string;
  paymentMethod?: string;
  date?: string;
  skipped?: boolean;
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
  frequency?: 'monthly';
  priority?: boolean;
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
