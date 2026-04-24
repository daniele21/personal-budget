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

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  createdAt: string;
}
