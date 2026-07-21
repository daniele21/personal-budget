import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComparePage } from '../ComparePage';
import type { Transaction } from '../../types';

const currentMonthDate = new Date();
currentMonthDate.setDate(5);
currentMonthDate.setHours(12, 0, 0, 0);

const transactions: Transaction[] = [
  {
    id: 'food',
    amount: 125,
    type: 'expense',
    category: 'Food',
    date: currentMonthDate.toISOString(),
    title: 'Groceries',
    description: '',
    paymentMethod: 'Card',
  },
  {
    id: 'previous-food',
    amount: 100,
    type: 'expense',
    category: 'Food',
    date: new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 5, 12).toISOString(),
    title: 'Previous groceries',
    description: '',
    paymentMethod: 'Card',
  },
];

const mockUseApp = vi.fn();

vi.mock('../../context/AppContext', () => ({ useApp: () => mockUseApp() }));

describe('ComparePage category report', () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue({ transactions });
  });

  it('prioritizes the ranked category list and keeps the donut supplementary', () => {
    render(
      <MemoryRouter>
        <ComparePage initialTab="spending" showViewSwitcher={false} showLensControl={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Spending by category' })).toBeInTheDocument();
    expect(screen.getAllByText('€125.00').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Total spent').closest('.aura-card-inverse')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Food/ })).toHaveAttribute('href', expect.stringContaining('category=Food'));

    const supplementaryChart = screen.getByLabelText(/Category distribution for/);
    expect(supplementaryChart).toHaveClass('hidden', 'md:flex');
  });

  it('keeps merchant comparison behind a secondary drill-down', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ComparePage initialTab="compare" showViewSwitcher={false} showLensControl={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('group', { name: 'Expense comparison view' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Key changes' })).toBeInTheDocument();
    expect(screen.getByText(/Source: .* compared with /)).toBeInTheDocument();
    expect(screen.getByText(/Expenses are up 25% versus period B\./)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Merchant comparison' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Compare by merchant' }));
    expect(screen.getByRole('heading', { name: 'Merchant comparison' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to expenses' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Expense comparison view' })).not.toBeInTheDocument();
  });

  it('shows an explicit empty state when neither period has activity', () => {
    mockUseApp.mockReturnValue({ transactions: [] });
    render(
      <MemoryRouter>
        <ComparePage initialTab="compare" showViewSwitcher={false} showLensControl={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('No transactions to compare')).toBeInTheDocument();
    expect(screen.getByText(/There is no reportable activity in/)).toBeInTheDocument();
  });
});
