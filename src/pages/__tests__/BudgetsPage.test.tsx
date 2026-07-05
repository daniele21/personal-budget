import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BudgetsPage } from '../BudgetsPage';
import { Transaction } from '../../types';

const mockUseApp = vi.fn();
const mockToast = vi.fn();

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
    mockUseApp.mockReturnValue({
      budgets: [{ category: 'Food', limit: 500, spent: 0, currency: '€' }],
      setBudgets: vi.fn(),
      categories: ['Food'],
      addCategory: vi.fn(),
      selectedMonth: new Date(2026, 4, 1),
      monthlyBudget: 3000,
      monthlyTransactions: [
        transaction({ id: 'regular-food', amount: 100 }),
        transaction({ id: 'extra-food', amount: 200, reportingClass: 'extra', reportingNote: 'Party' }),
      ],
    });
  });

  it('uses actual spend as the default budget progress and shows net-of-extras as secondary context', () => {
    render(<BudgetsPage />);

    expect(screen.getByText(/€300\.00 of €500\.00/)).toBeInTheDocument();
    expect(screen.getByText('€100.00 net of extras · +€200.00 extras')).toBeInTheDocument();
    expect(screen.getByText('€100.00 net · +€200.00 extras')).toBeInTheDocument();
  });

  it('switches budget progress to net view when Net is selected', async () => {
    const user = userEvent.setup();
    render(<BudgetsPage />);

    expect(screen.getByText('60%')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Net' }));

    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.queryByText('€100.00 net · +€200.00 extras')).not.toBeInTheDocument();
  });
});
