import { describe, expect, it } from 'vitest';
import { INITIAL_APP_DATA } from '../../data/model';
import { appDataReducer, AppDataState } from '../AppDataProvider';
import { Transaction, Budget, RecurringExpense } from '../../types';

const BASE_STATE: AppDataState = {
  ...INITIAL_APP_DATA,
  onboardingComplete: true,
  initialDataChoice: 'demo',
};

const mockTransaction = (id: string, amount = 100): Transaction => ({
  id,
  amount,
  type: 'expense',
  category: 'Food',
  date: '2026-04-10T00:00:00.000Z',
  title: `Tx ${id}`,
  description: '',
  paymentMethod: 'Card',
});

const mockBudget = (category: string, limit = 500): Budget => ({
  category,
  limit,
  spent: 0,
  currency: 'EUR',
});

const mockRecurring = (id: string, amount = 50): RecurringExpense => ({
  id,
  name: `Bill ${id}`,
  amount,
  startDate: '2026-04-01T00:00:00.000Z',
  endDate: '',
  dayOfMonth: 1,
  category: 'Utilities',
  type: 'expense',
  frequency: 'monthly',
});

describe('appDataReducer regression tests', () => {
  it('transactions/replaced replaces the entire list instead of appending', () => {
    const stateWithTx = {
      ...BASE_STATE,
      transactions: [mockTransaction('old-1'), mockTransaction('old-2')],
    };

    const nextState = appDataReducer(stateWithTx, {
      type: 'transactions/replaced',
      transactions: [mockTransaction('new-1'), mockTransaction('new-2')],
    });

    expect(nextState.transactions).toHaveLength(2);
    expect(nextState.transactions.map(t => t.id)).toEqual(['new-1', 'new-2']);
  });

  it('budgets/replaced replaces the entire budgets list, removing absent budgets', () => {
    const stateWithBudgets = {
      ...BASE_STATE,
      budgets: [mockBudget('Food'), mockBudget('Travel')],
    };

    const nextState = appDataReducer(stateWithBudgets, {
      type: 'budgets/replaced',
      budgets: [mockBudget('Food'), mockBudget('Utilities')],
    });

    expect(nextState.budgets).toHaveLength(2);
    expect(nextState.budgets.map(b => b.category)).toEqual(['Food', 'Utilities']);
  });

  it('recurring/replaced replaces the entire list without duplication', () => {
    const stateWithRecurring = {
      ...BASE_STATE,
      recurring: [mockRecurring('rent')],
    };

    const nextState = appDataReducer(stateWithRecurring, {
      type: 'recurring/replaced',
      recurring: [mockRecurring('internet'), mockRecurring('phone')],
    });

    expect(nextState.recurring).toHaveLength(2);
    expect(nextState.recurring.map(r => r.id)).toEqual(['internet', 'phone']);
  });

  it('categories/replaced replaces the categories list', () => {
    const stateWithCategories = {
      ...BASE_STATE,
      categories: ['Food', 'Travel'],
    };

    const nextState = appDataReducer(stateWithCategories, {
      type: 'categories/replaced',
      categories: ['Food', 'Shopping', 'Health'],
    });

    expect(nextState.categories).toEqual(['Food', 'Shopping', 'Health']);
  });

  it('data/reset resets the state back to initial choices and completes onboarding complete to false', () => {
    const stateToReset = {
      ...BASE_STATE,
      transactions: [mockTransaction('tx-1')],
      budgets: [mockBudget('Food')],
    };

    const nextState = appDataReducer(stateToReset, { type: 'data/reset' });

    expect(nextState.onboardingComplete).toBe(false);
    expect(nextState.initialDataChoice).toBeNull();
    expect(nextState.transactions).toHaveLength(0);
    expect(nextState.budgets).toHaveLength(0);
  });

  it('complete transaction lifecycle (create -> update -> delete -> undo) works correctly without duplication', () => {
    // 1. Initial State
    let state = { ...BASE_STATE };

    // 2. Create
    const tx = mockTransaction('test-lifecycle', 100);
    state = appDataReducer(state, { type: 'transaction/created', transaction: tx });
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].amount).toBe(100);

    // 3. Update
    const updatedTx = { ...tx, amount: 150 };
    state = appDataReducer(state, { type: 'transaction/updated', id: tx.id, transaction: updatedTx });
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].amount).toBe(150);

    // 4. Delete
    state = appDataReducer(state, { type: 'transaction/deleted', id: tx.id });
    expect(state.transactions).toHaveLength(0);

    // 5. Undo (using replaced setter logic passing the restored state back)
    const listForUndo = [tx];
    state = appDataReducer(state, { type: 'transactions/replaced', transactions: listForUndo });
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].id).toBe('test-lifecycle');
    expect(state.transactions[0].amount).toBe(100);
  });
});
