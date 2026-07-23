import { describe, expect, it } from 'vitest';
import {
  INITIAL_APP_DATA,
  isFinancialDataEmpty,
  normalizeAppData,
  projectAppData,
  syncAppData,
} from '../model';
import { RecurringExpense, Transaction } from '../../types';

function recurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'rent',
    name: 'Rent',
    amount: 900,
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    dayOfMonth: 1,
    category: 'Housing',
    type: 'expense',
    frequency: 'monthly',
    ...overrides,
  };
}

describe('central app data model', () => {
  it('projects richer application state onto the exact canonical AppData shape', () => {
    const extendedState = {
      ...INITIAL_APP_DATA,
      onboardingComplete: true,
      initialDataChoice: 'demo',
    };
    const projected = projectAppData(extendedState);

    expect(projected).toEqual(INITIAL_APP_DATA);
    expect(projected).not.toHaveProperty('onboardingComplete');
    expect(projected).not.toHaveProperty('initialDataChoice');
  });

  it('normalizes partial persisted data through one canonical shape', () => {
    const data = normalizeAppData({
      categories: ['Housing'],
      monthlyBudget: 1200,
    });

    expect(data).toEqual({
      ...INITIAL_APP_DATA,
      categories: ['Housing'],
      monthlyBudget: 1200,
    });
  });

  it('generates due recurring transactions while syncing the app data model', () => {
    const data = syncAppData({
      ...INITIAL_APP_DATA,
      recurring: [recurring()],
    }, new Date(2026, 4, 15));

    expect(data.transactions.map((transaction) => transaction.sourceMonthKey)).toEqual([
      '2026-04',
      '2026-05',
    ]);
    expect(data.transactions.every((transaction) => transaction.sourceRecurringId === 'rent')).toBe(true);
    expect(data.transactions.every((transaction) => transaction.reportingClass === undefined)).toBe(true);
  });

  it('normalizes reporting metadata and strips extras from recurring-linked transactions', () => {
    const transactions: Transaction[] = [
      {
        id: 'manual-extra',
        amount: 200,
        type: 'expense',
        category: 'Travel',
        date: '2026-04-10T00:00:00.000Z',
        title: 'Trip',
        description: '',
        paymentMethod: 'Card',
        reportingClass: 'extra',
        reportingNote: 'Vacation',
      },
      {
        id: 'rec-extra',
        amount: 900,
        type: 'expense',
        category: 'Housing',
        date: '2026-04-01T00:00:00.000Z',
        title: 'Rent',
        description: 'Auto-generated from recurring: Rent',
        paymentMethod: 'Bank Transfer',
        sourceRecurringId: 'rent',
        sourceMonthKey: '2026-04',
        reportingClass: 'extra',
        reportingNote: 'Should be stripped',
      },
      {
        id: 'income-reimbursement',
        amount: 75,
        type: 'income',
        category: 'Medical',
        date: '2026-04-12T00:00:00.000Z',
        title: 'Insurance refund',
        description: '',
        paymentMethod: 'Bank Transfer',
        reportingClass: 'reimbursement',
      },
      {
        id: 'expense-reimbursement',
        amount: 75,
        type: 'expense',
        category: 'Medical',
        date: '2026-04-12T00:00:00.000Z',
        title: 'Bad refund',
        description: '',
        paymentMethod: 'Bank Transfer',
        reportingClass: 'reimbursement',
      },
    ];

    const data = normalizeAppData({
      ...INITIAL_APP_DATA,
      transactions,
      recurring: [recurring()],
    });

    expect(data.transactions.find((transaction) => transaction.id === 'manual-extra')?.reportingClass).toBe('extra');
    expect(data.transactions.find((transaction) => transaction.id === 'income-reimbursement')?.reportingClass).toBe('reimbursement');
    expect(data.transactions.find((transaction) => transaction.id === 'expense-reimbursement')?.reportingClass).toBeUndefined();
    expect(data.transactions.find((transaction) => transaction.id === 'rec-extra')?.reportingClass).toBeUndefined();
    expect(data.transactions.find((transaction) => transaction.id === 'rec-extra')?.reportingNote).toBeUndefined();
  });

  it('removes legacy remote demo receipt URLs from the canonical attachment reference', () => {
    const data = normalizeAppData({
      ...INITIAL_APP_DATA,
      transactions: [{
        id: 'legacy-demo-receipt',
        amount: 25,
        type: 'expense',
        category: 'Shopping',
        date: '2026-04-10T00:00:00.000Z',
        title: 'Demo purchase',
        description: '',
        paymentMethod: 'Card',
        attachmentUrl: 'https://images.unsplash.com/photo-demo?auto=format&fit=crop&w=400',
      }],
    });

    expect(data.transactions[0].attachmentUrl).toBeUndefined();
  });

  it('migrates legacy account balances to opening balances without double semantics', () => {
    const data = normalizeAppData({
      accounts: [{
        id: 'legacy-account',
        name: 'Main',
        bank: 'Bank',
        lastFour: '1234',
        balance: 1250,
        type: 'checking',
      }],
    });

    expect(data.accounts).toEqual([expect.objectContaining({ openingBalance: 1250 })]);
    expect(data.accounts[0]).not.toHaveProperty('balance');
  });

  it('checks financial emptiness from the canonical financial collections', () => {
    expect(isFinancialDataEmpty(INITIAL_APP_DATA)).toBe(true);
    expect(isFinancialDataEmpty({
      ...INITIAL_APP_DATA,
      recurring: [recurring()],
    })).toBe(false);
  });
});
