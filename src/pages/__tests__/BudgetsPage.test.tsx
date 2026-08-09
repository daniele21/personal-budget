import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetsPage } from '../BudgetsPage';
import { Transaction } from '../../types';

const mockUseApp = vi.fn();
const mockToast = vi.fn();
const mockSetBudgets = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => mockUseApp(),
}));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    amount: 100,
    type: 'expense',
    category: 'Food',
    date: '2026-05-05T00:00:00.000Z',
    title: 'Groceries',
    description: '',
    paymentMethod: 'Card',
    ...overrides,
  };
}

describe('BudgetsPage extra reporting', () => {
  beforeEach(() => {
    mockSetBudgets.mockReset();
    mockToast.mockReset();
    mockUseApp.mockImplementation(() => {
      const [analyticsLens, setAnalyticsLens] = React.useState<'actual' | 'normalized'>('actual');
      return {
        budgets: [{ category: 'Food', limit: 500, spent: 0, currency: '€' }],
        setBudgets: mockSetBudgets,
        categories: ['Food', 'Travel'],
        addCategory: vi.fn(),
        selectedMonth: new Date(2026, 4, 1),
        monthlyBudget: 3000,
        monthlyTransactions: [
          transaction({ id: 'regular-food', amount: 100 }),
          transaction({ id: 'extra-food', amount: 200, reportingClass: 'extra', reportingNote: 'Party' }),
          transaction({ id: 'small-income', amount: 50, type: 'income', category: 'Travel', title: 'Gift' }),
        ],
        analyticsLens,
        setAnalyticsLens,
      };
    });
  });

  it('uses actual spend as the default budget progress', () => {
    render(<BudgetsPage />);

    expect(screen.getByText('€300.00')).toBeInTheDocument();
    expect(screen.getByText('spent of €500.00')).toBeInTheDocument();
    expect(screen.getByText('60% used')).toBeInTheDocument();
  });

  it('switches budget progress to net view when Net is selected', async () => {
    const user = userEvent.setup();
    render(<BudgetsPage />);

    expect(screen.getByText('60% used')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Net of extras' }));

    expect(screen.getByText('20% used')).toBeInTheDocument();
    expect(screen.getByText('€100.00')).toBeInTheDocument();
  });

  it('labels the monthly limit and category-budget denominators separately', () => {
    render(<BudgetsPage />);

    expect(screen.getByText('Monthly budget')).toBeInTheDocument();
    expect(screen.getByText('60% used')).toBeInTheDocument();
    expect(screen.getByText('40% remaining')).toBeInTheDocument();
    expect(screen.getByText('Safe to spend')).toBeInTheDocument();
    expect(screen.getByText('€2,700.00')).toBeInTheDocument();
    expect(screen.getByText('10% of €3,000.00 monthly limit used')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /monthly limit used/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add category budget' })).toBeInTheDocument();
  });

  it('adds a category budget through the shared amount keypad', async () => {
    const user = userEvent.setup();
    render(<BudgetsPage />);

    await user.click(screen.getByRole('button', { name: 'Add category budget' }));
    await user.click(screen.getByRole('button', { name: /Tap to edit/ }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    await user.click(screen.getByRole('button', { name: 'Confirm Amount' }));
    await user.click(screen.getByRole('button', { name: 'Save Budget' }));

    expect(mockSetBudgets).toHaveBeenCalledWith([
      expect.objectContaining({ category: 'Food', limit: 500 }),
      expect.objectContaining({ category: 'Travel', limit: 200 }),
    ]);
    expect(mockToast).toHaveBeenCalledWith('Budget added', 'success');
  });

  it('deletes and restores a budget without duplicating it', async () => {
    const user = userEvent.setup();
    render(<BudgetsPage />);

    await user.click(screen.getByRole('button', { name: 'Edit Food budget' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockSetBudgets).toHaveBeenCalledWith([]);

    const undo = mockToast.mock.calls.find(([message]) => message === 'Budget removed')?.[3];
    undo?.onClick();
    expect(mockSetBudgets).toHaveBeenLastCalledWith([
      expect.objectContaining({ category: 'Food', limit: 500 }),
    ]);
  });
});
