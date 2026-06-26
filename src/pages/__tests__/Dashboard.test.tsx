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

    expect(screen.getByText('€2,300.00')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Net' })[0]);

    expect(screen.getByText('€2,900.00')).toBeInTheDocument();
    expect(screen.getByText('of €3,000.00 safe limit')).toBeInTheDocument();
  });

  it('uses reimbursement cash inflow for safe-to-spend without counting it as income', () => {
    renderDashboard([
      transaction({ id: 'refund', amount: 100, type: 'income', category: 'Food', title: 'Refund', reportingClass: 'reimbursement' }),
    ]);

    expect(screen.getByText('of €100.00 safe limit')).toBeInTheDocument();
  });
});
