import { APP_CONFIG, INITIAL_CATEGORIES } from '../constants';
import { Account, Budget, RecurringExpense, SavingsGoal, Transaction } from '../types';
import type { AppData } from './model';

export type DemoDataSet = AppData;

function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function clampDay(year: number, monthIndex: number, day: number): number {
  return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

/**
 * Builds a small, realistic demo ledger around the current month.
 * Dates are generated at runtime so dashboard, budget, and report surfaces
 * show useful data even months after the app was installed.
 */
export function buildDemoData(now = new Date()): DemoDataSet {
  const year = now.getFullYear();
  const month = now.getMonth();
  const previousMonth = new Date(year, month - 1, 1);
  const previousYear = previousMonth.getFullYear();
  const previousMonthIndex = previousMonth.getMonth();

  const date = (day: number) => isoDate(year, month, clampDay(year, month, day));
  const prevDate = (day: number) => isoDate(previousYear, previousMonthIndex, clampDay(previousYear, previousMonthIndex, day));

  const transactions: Transaction[] = [
    {
      id: 'demo-tx-salary-current',
      amount: 3200,
      type: 'income',
      category: 'Salary',
      date: date(1),
      title: 'Stipendio',
      description: 'Entrata mensile demo',
      paymentMethod: 'Bank transfer',
      verified: true,
    },
    {
      id: 'demo-tx-rent-current',
      amount: 1050,
      type: 'expense',
      category: 'Housing',
      date: date(2),
      title: 'Affitto',
      description: 'Pagamento casa',
      paymentMethod: 'Bank transfer',
      verified: true,
    },
    {
      id: 'demo-tx-groceries-current',
      amount: 186.4,
      type: 'expense',
      category: 'Groceries',
      date: date(6),
      title: 'Spesa settimanale',
      description: 'Supermercato',
      paymentMethod: 'Debit card',
      verified: true,
    },
    {
      id: 'demo-tx-transport-current',
      amount: 54.9,
      type: 'expense',
      category: 'Transport',
      date: date(8),
      title: 'Abbonamento mezzi',
      description: 'Trasporto pubblico',
      paymentMethod: 'Debit card',
      verified: true,
    },
    {
      id: 'demo-tx-dining-current',
      amount: 72.5,
      type: 'expense',
      category: 'Dining',
      date: date(12),
      title: 'Cena fuori',
      description: 'Ristorante',
      paymentMethod: 'Credit card',
      verified: true,
    },
    {
      id: 'demo-tx-utilities-current',
      amount: 118.2,
      type: 'expense',
      category: 'Utilities',
      date: date(15),
      title: 'Luce e gas',
      description: 'Utenze mensili',
      paymentMethod: 'Direct debit',
      verified: true,
    },
    {
      id: 'demo-tx-shopping-current',
      amount: 129.99,
      type: 'expense',
      category: 'Shopping',
      date: date(18),
      title: 'Acquisto online',
      description: 'Abbigliamento',
      paymentMethod: 'Credit card',
      verified: true,
    },
    {
      id: 'demo-tx-health-current',
      amount: 38,
      type: 'expense',
      category: 'Health',
      date: date(20),
      title: 'Farmacia',
      description: 'Prodotti salute',
      paymentMethod: 'Debit card',
      verified: true,
    },
    {
      id: 'demo-tx-salary-previous',
      amount: 3200,
      type: 'income',
      category: 'Salary',
      date: prevDate(1),
      title: 'Stipendio mese scorso',
      description: 'Entrata mensile demo',
      paymentMethod: 'Bank transfer',
      verified: true,
    },
    {
      id: 'demo-tx-rent-previous',
      amount: 1050,
      type: 'expense',
      category: 'Housing',
      date: prevDate(2),
      title: 'Affitto mese scorso',
      description: 'Pagamento casa',
      paymentMethod: 'Bank transfer',
      verified: true,
    },
    {
      id: 'demo-tx-groceries-previous',
      amount: 214.8,
      type: 'expense',
      category: 'Groceries',
      date: prevDate(9),
      title: 'Spesa mese scorso',
      description: 'Supermercato',
      paymentMethod: 'Debit card',
      verified: true,
    },
    {
      id: 'demo-tx-entertainment-previous',
      amount: 64,
      type: 'expense',
      category: 'Entertainment',
      date: prevDate(16),
      title: 'Cinema e streaming',
      description: 'Tempo libero',
      paymentMethod: 'Credit card',
      verified: true,
    },
  ];

  const budgets: Budget[] = [
    { category: 'Housing', limit: 1200, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Groceries', limit: 420, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Dining', limit: 220, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Transport', limit: 120, spent: 0, currency: APP_CONFIG.currency },
    { category: 'Shopping', limit: 250, spent: 0, currency: APP_CONFIG.currency },
  ];

  const recurring: RecurringExpense[] = [
    {
      id: 'demo-rec-rent',
      name: 'Affitto',
      amount: 1050,
      startDate: date(1),
      endDate: isoDate(year + 1, month, 1),
      dayOfMonth: 2,
      category: 'Housing',
      type: 'expense',
      frequency: 'monthly',
      reminder: { enabled: true, leadDays: 1 },
    },
    {
      id: 'demo-rec-streaming',
      name: 'Streaming',
      amount: 14.99,
      startDate: date(1),
      endDate: isoDate(year + 1, month, 1),
      dayOfMonth: 10,
      category: 'Entertainment',
      type: 'expense',
      frequency: 'monthly',
      reminder: { enabled: true, leadDays: 2 },
    },
  ];

  const accounts: Account[] = [
    {
      id: 'demo-account-main',
      name: 'Conto principale',
      bank: 'Aura Bank',
      lastFour: '2401',
      balance: 4280,
      type: 'checking',
      status: 'active',
    },
    {
      id: 'demo-account-savings',
      name: 'Risparmi',
      bank: 'Aura Bank',
      lastFour: '8842',
      balance: 7600,
      type: 'savings',
      apy: '2.1%',
      status: 'active',
    },
  ];

  const savingsGoals: SavingsGoal[] = [
    {
      id: 'demo-goal-emergency',
      name: 'Fondo emergenza',
      targetAmount: 9000,
      currentAmount: 4200,
      targetDate: isoDate(year + 1, month, 1),
      createdAt: new Date(year, month, 1).toISOString(),
    },
  ];

  return {
    transactions,
    budgets,
    recurring,
    accounts,
    categories: Array.from(new Set([...INITIAL_CATEGORIES, 'Travel', 'Education'])),
    archivedCategories: [],
    savingsGoals,
    monthlyBudget: 3000,
  };
}
