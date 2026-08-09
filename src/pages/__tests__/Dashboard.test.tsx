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

function renderDashboard(transactions: Transaction[], overrides: Record<string, unknown> = {}) {
  mockUseApp.mockImplementation(() => {
    const [analyticsLens, setAnalyticsLens] = React.useState<'actual' | 'normalized'>('actual');
    return {
      transactions,
      setTransactions: vi.fn(),
      budgets: [],
      recurring: [],
      accounts: [],
      monthlyTotals: calculateTotals(transactions),
      monthlyBudget: 3000,
      monthlyTransactions: transactions,
      expenseMomChange: null,
      netMomChange: null,
      recentTransactions: transactions,
      isHydrated: true,
      categories: ['Salary', 'Food', 'Travel'],
      addCategory: vi.fn(),
      selectedMonth: new Date(),
      setSelectedMonth: vi.fn(),
      analyticsLens,
      setAnalyticsLens,
      ...overrides,
    };
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

    await user.click(screen.getByRole('button', { name: 'Net of extras' }));

    expect(screen.getByText('€2,900.00')).toBeInTheDocument();
    expect(screen.getByText(/spent of €3,000\.00/)).toBeInTheDocument();
  });

  it('does not use a reimbursement-only inflow as the safe-to-spend limit', () => {
    renderDashboard([
      transaction({ id: 'refund', amount: 100, type: 'income', category: 'Food', title: 'Refund', reportingClass: 'reimbursement' }),
    ]);

    expect(screen.getByText('€3,000.00')).toBeInTheDocument();
    expect(screen.getByText(/spent of €3,000\.00/)).toBeInTheDocument();
  });

  it('shows remaining safe-to-spend room even when no income is recorded for the month', () => {
    renderDashboard([
      transaction({ id: 'expense', amount: 1737.96, type: 'expense', category: 'Food', title: 'Monthly spend' }),
    ]);

    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('€0.00')).toBeInTheDocument();
    expect(screen.getByText('€1,262.04')).toBeInTheDocument();
  });

  it('does not replace the monthly budget with a small recorded income', () => {
    renderDashboard([
      transaction({ id: 'expenses', amount: 1746.29, type: 'expense', title: 'Monthly spend' }),
      transaction({ id: 'gift', amount: 50, type: 'income', category: 'Entertainment', title: 'Birthday gift' }),
    ], { monthlyBudget: 2800 });

    expect(screen.getByText('€1,053.71')).toBeInTheDocument();
    expect(screen.getByText(/spent of €2,800\.00/)).toBeInTheDocument();
    expect(screen.getByText('62% used · On track')).toBeInTheDocument();
  });

  it('presents the period before the primary metric and keeps ordinary expenses neutral', () => {
    renderDashboard([transaction({ amount: 100 })]);

    const monthSnapshot = screen.getAllByText(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))[0];
    const primaryMetric = screen.getByText('Available to spend');
    expect(monthSnapshot.compareDocumentPosition(primaryMetric) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const expenseAmount = screen.getAllByText('-€100.00').find((element) =>
      element.classList.contains('text-on-surface'),
    );
    expect(expenseAmount).toBeDefined();
    expect(expenseAmount).toHaveClass('text-on-surface');
    expect(expenseAmount).not.toHaveClass('text-tertiary');
    expect(screen.getByRole('img', { name: 'Cash flow trend for the selected month' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View report' })).toHaveAttribute('href', '/reports');
  });

  it('marks the hero as over budget only after the effective limit is exceeded', () => {
    renderDashboard([transaction({ amount: 3100 })]);

    expect(screen.getByText(/used · Over budget/)).toBeInTheDocument();
    expect(screen.getByText('Available to spend').closest('.aura-card-inverse')).toHaveClass(
      'aura-card-inverse-tone-danger',
    );
    const overBudgetAmount = screen.getAllByText('€0.00').find((element) =>
      element.classList.contains('text-inverse-on-surface'),
    );
    expect(overBudgetAmount).toBeDefined();
  });

  it('labels expense and net changes with their distinct meanings', () => {
    renderDashboard([transaction({ amount: 100 })], {
      expenseMomChange: 25,
      netMomChange: -50,
    });

    expect(screen.getByText('Spending is 25% lower than last month.')).toBeInTheDocument();
    expect(screen.getByText('-50% vs previous month')).toBeInTheDocument();
  });

  it('describes past months as closed instead of showing days remaining', () => {
    const pastMonth = new Date();
    pastMonth.setMonth(pastMonth.getMonth() - 1, 1);
    renderDashboard([transaction({ amount: 100 })], { selectedMonth: pastMonth });

    expect(screen.getByText('Month closed')).toBeInTheDocument();
    expect(screen.queryByText(/days remaining/)).not.toBeInTheDocument();
  });
});
