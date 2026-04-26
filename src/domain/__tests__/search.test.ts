import { describe, expect, it } from 'vitest';
import { searchAura } from '../search';
import { Budget, RecurringExpense, SavingsGoal, Transaction } from '../../types';

const transaction: Transaction = {
  id: 'tx1',
  amount: 42,
  type: 'expense',
  category: 'Dining',
  date: '2026-04-10T00:00:00.000Z',
  title: 'Lunch',
  description: 'Team meal',
  paymentMethod: 'Card',
};

const recurring: RecurringExpense = {
  id: 'r1',
  name: 'Rent',
  amount: 900,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  dayOfMonth: 1,
  category: 'Housing',
  type: 'expense',
};

const budget: Budget = { category: 'Groceries', limit: 300, spent: 0, currency: '€' };
const goal: SavingsGoal = {
  id: 'g1',
  name: 'Emergency fund',
  targetAmount: 5000,
  currentAmount: 1000,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const source = {
  transactions: [transaction],
  recurring: [recurring],
  budgets: [budget],
  savingsGoals: [goal],
  categories: ['Dining', 'Transport'],
};

describe('searchAura', () => {
  it('searches across supported entities', () => {
    const results = searchAura(source, 'dining');
    expect(results.map((result) => result.entity)).toContain('transaction');
    expect(results.map((result) => result.entity)).toContain('category');
  });

  it('matches numeric amounts', () => {
    const results = searchAura(source, '900');
    expect(results[0]).toMatchObject({ entity: 'recurring', title: 'Rent' });
  });

  it('returns an empty result for blank queries', () => {
    expect(searchAura(source, '   ')).toEqual([]);
  });

  it('limits results deterministically', () => {
    expect(searchAura(source, 'e', 2)).toHaveLength(2);
  });
});
