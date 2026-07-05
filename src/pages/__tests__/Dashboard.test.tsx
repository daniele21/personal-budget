import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import { calculateTotals } from '../../domain/finance';
import { Transaction } from '../../types';

const mockUseApp = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => mockUseApp(),
}));

vi.mock('../../hooks/useAnimatedNumber', () => ({
  useAnimatedNumber: (value: number) => value,
}));

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  const currentMonthDate = new Date();
  currentMonthDate.setDate(5);
  currentMonthDate.setHours(0, 0, 0, 0);

  return {
    id: 'tx-1',
    amount: 100,
    type: 'expense',
    category: 'Food',
    date: currentMonthDate.toISOString(),
    title: 'Groceries',
    description: '',
    paymentMethod: 'Card',
    ...overrides,
  };
}

function renderDashboard(transactions: Transaction[]) {
  mockUseApp.mockReturnValue({
    transactions,
    setTransactions: vi.fn(),
    budgets: [],
    recurring: [],
    accounts: [],
    monthlyTotals: calculateTotals(transactions),
    monthlyBudget: 3000,
    monthlyTransactions: transactions,
    momChange: null,
    recentTransactions: transactions,
    isHydrated: true,
    categories: ['Salary', 'Food', 'Travel'],
    addCategory: vi.fn(),
    selectedMonth: new Date(),
    setSelectedMonth: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard safe-to-spend lens', () => {
  it('switches safe-to-spend between with-extra and net views', async () => {
    const user = userEvent.setup();
    renderDashboard([
      transaction({ id: 'salary', amount: 3000, type: 'income', category: 'Salary', title: 'Salary' }),
      transaction({ id: 'food', amount: 100, type: 'expense', category: 'Food', title: 'Groceries' }),
      transaction({ id: 'trip', amount: 600, type: 'expense', category: 'Travel', title: 'Holiday', reportingClass: 'extra' }),
      transaction({ id: 'bonus', amount: 500, type: 'income', category: 'Bonus', title: 'Bonus', reportingClass: 'extra' }),
    ]);

    expect(screen.getAllByText('€2,300.00')).toHaveLength(2);

    await user.click(screen.getAllByRole('radio', { name: 'Net' })[0]);

    expect(screen.getAllByText('€2,900.00')).toHaveLength(2);
    expect(screen.getByText('of €3,000.00')).toBeInTheDocument();
  });

  it('does not use a reimbursement-only inflow as the safe-to-spend limit', () => {
    renderDashboard([
      transaction({ id: 'refund', amount: 100, type: 'income', category: 'Food', title: 'Refund', reportingClass: 'reimbursement' }),
    ]);

    expect(screen.getAllByText('€3,000.00')).toHaveLength(2);
    expect(screen.getByText('of €3,000.00')).toBeInTheDocument();
  });

  it('shows remaining safe-to-spend room even when no income is recorded for the month', () => {
    renderDashboard([
      transaction({ id: 'expense', amount: 1737.96, type: 'expense', category: 'Food', title: 'Monthly spend' }),
    ]);

    expect(screen.getByText('Income this month')).toBeInTheDocument();
    expect(screen.getByText('€0.00')).toBeInTheDocument();
    expect(screen.getAllByText('€1,262.04')).toHaveLength(2);
  });
});
