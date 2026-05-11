import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { InsightsPage } from '../InsightsPage';
import { Transaction } from '../../types';

const mockUseApp = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => mockUseApp(),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <InsightsPage />
    </MemoryRouter>,
  );
}

describe('InsightsPage analytics lenses', () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue({
      transactions: [
        transaction({ id: 'salary', amount: 3000, type: 'income', category: 'Salary', title: 'Salary' }),
        transaction({ id: 'food', amount: 100, type: 'expense', category: 'Food', title: 'Groceries' }),
        transaction({ id: 'trip', amount: 600, type: 'expense', category: 'Travel', title: 'Holiday', reportingClass: 'extra' }),
        transaction({ id: 'bonus', amount: 500, type: 'income', category: 'Bonus', title: 'Bonus', reportingClass: 'extra' }),
      ],
      budgets: [{ category: 'Food', limit: 500, spent: 0, currency: '€' }],
    });
  });

  it('defaults to actual totals and shows the extra impact callout', () => {
    renderPage();

    expect(screen.getByText('Extras this period: €600.00 expenses · €500.00 income')).toBeInTheDocument();
    expect(screen.getByText('€3,500.00')).toBeInTheDocument();
    expect(screen.getByText('€700.00')).toBeInTheDocument();
    expect(screen.getByText('+€2,800.00')).toBeInTheDocument();
  });

  it('switches to net-of-extras totals', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /net of extras/i }));

    expect(screen.getByText('€3,000.00')).toBeInTheDocument();
    expect(screen.getByText('€100.00')).toBeInTheDocument();
    expect(screen.getByText('+€2,900.00')).toBeInTheDocument();
    expect(screen.queryByText('Travel')).not.toBeInTheDocument();
  });

  it('switches to extras-only totals and categories', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^extras$/i }));

    expect(screen.queryByText(/extras this period/i)).not.toBeInTheDocument();
    expect(screen.getByText('€500.00')).toBeInTheDocument();
    expect(screen.getByText('€600.00')).toBeInTheDocument();
    expect(screen.getByText('-€100.00')).toBeInTheDocument();
    expect(screen.getAllByText('Travel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bonus').length).toBeGreaterThan(0);

    expect(screen.queryByText('Food')).not.toBeInTheDocument();
  });
});
