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

function renderPage() {
  return render(
    <MemoryRouter>
      <InsightsPage />
    </MemoryRouter>,
  );
}

describe('InsightsPage analytics lenses', () => {
  beforeEach(() => {
    const selectedMonth = new Date();
    selectedMonth.setDate(1);
    selectedMonth.setHours(0, 0, 0, 0);

    mockUseApp.mockReturnValue({
      transactions: [
        transaction({ id: 'salary', amount: 3000, type: 'income', category: 'Salary', title: 'Salary' }),
        transaction({ id: 'food', amount: 100, type: 'expense', category: 'Food', title: 'Groceries' }),
        transaction({ id: 'trip', amount: 600, type: 'expense', category: 'Travel', title: 'Holiday', reportingClass: 'extra' }),
        transaction({ id: 'bonus', amount: 500, type: 'income', category: 'Bonus', title: 'Bonus', reportingClass: 'extra' }),
        transaction({
          id: 'previous-food',
          amount: 200,
          date: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 10, 12).toISOString(),
        }),
        transaction({
          id: 'older-food',
          amount: 100,
          date: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 2, 10, 12).toISOString(),
        }),
      ],
      setTransactions: vi.fn(),
      budgets: [{ category: 'Food', limit: 500, spent: 0, currency: '€' }],
      recurring: [],
      setRecurring: vi.fn(),
      categories: ['Food', 'Travel', 'Salary', 'Bonus'],
      addCategory: vi.fn(),
      monthlyBudget: 3000,
      selectedMonth,
    });
  });

  it('defaults to actual totals and shows the extra impact callout', () => {
    renderPage();

    expect(screen.getByText('Extras this period: €600.00 expenses · €500.00 income')).toBeInTheDocument();
    expect(screen.getAllByText('€700.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Spent').closest('.aura-card-inverse')).toBeInTheDocument();
  });

  it('switches to net-of-extras totals', async () => {
    const user = userEvent.setup();
    renderPage();

    const netToggle = screen.getByRole('button', { name: 'Net of extras' });
    await user.click(netToggle);

    expect(netToggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Actual, includes extras' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByText('€100.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Excluded from Net: €600.00 expenses · €500.00 income')).toBeInTheDocument();
  });

  it('keeps operational safe-to-spend metrics out of Reports Overview', () => {
    renderPage();

    expect(screen.queryByText('Safe to Spend')).not.toBeInTheDocument();
    expect(screen.queryByText(/safe limit/)).not.toBeInTheDocument();
  });

  it('compares net cash flow with the previous net instead of treating income as a goal', () => {
    renderPage();

    expect(screen.getAllByText('Net cash flow').length).toBeGreaterThan(0);
    expect(screen.getByText('Previous period')).toBeInTheDocument();
    expect(screen.queryByText(/Goal /)).not.toBeInTheDocument();
  });

  it('switches to extras-only totals and categories', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Actual, includes extras' }));

    expect(screen.getByText('Extras this period: €600.00 expenses · €500.00 income')).toBeInTheDocument();
    expect(screen.getAllByText('€700.00').length).toBeGreaterThan(0);
  });

  it('uses the selected app month as the range anchor for multi-month filters', async () => {
    const user = userEvent.setup();
    mockUseApp.mockReturnValue({
      transactions: [
        transaction({ id: 'may-income', amount: 1000, type: 'income', date: new Date(2026, 4, 5).toISOString() }),
        transaction({ id: 'jun-income', amount: 2000, type: 'income', date: new Date(2026, 5, 5).toISOString() }),
        transaction({ id: 'jul-income', amount: 3000, type: 'income', date: new Date(2026, 6, 5).toISOString() }),
        transaction({ id: 'apr-income', amount: 9000, type: 'income', date: new Date(2026, 3, 5).toISOString() }),
      ],
      setTransactions: vi.fn(),
      budgets: [],
      recurring: [],
      setRecurring: vi.fn(),
      categories: ['Salary'],
      addCategory: vi.fn(),
      monthlyBudget: 3000,
      selectedMonth: new Date(2026, 6, 1),
    });

    renderPage();
    await user.selectOptions(screen.getByRole('combobox', { name: /select period/i }), '3M');

    expect(screen.getByRole('combobox', { name: /select period/i })).toHaveValue('3M');
    expect(screen.getAllByText('1 May – 31 Jul').length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByRole('combobox', { name: /select period/i }), '6M');

    expect(screen.getByRole('combobox', { name: /select period/i })).toHaveValue('6M');
    expect(screen.getAllByText('1 Feb – 31 Jul').length).toBeGreaterThan(0);
  });

  it('shows one calendar-month spending baseline and its derived equivalents', async () => {
    const user = userEvent.setup();
    renderPage();

    const calloutButton = screen.getByRole('button', { name: /open spending pace trend/i });
    expect(calloutButton).toBeInTheDocument();
    expect(screen.getAllByText('monthly equivalent')).toHaveLength(2);
    expect(screen.getByText('2 complete months')).toBeInTheDocument();

    await user.click(calloutButton);

    expect(screen.getByRole('heading', { name: /spending pace/i })).toBeInTheDocument();
    const today = new Date();
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const previousMonthStart = new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth(), 1);
    const expectedPeriod = `${previousMonthStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${previousMonthEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    expect(screen.getByText(`Calendar-month spending · ${expectedPeriod}`)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Actual monthly spending and monthly spending pace/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Day$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/weekly and daily figures are equivalents of the same baseline/i)).toBeInTheDocument();
  });

  it('uses only complete calendar months for multi-month spending pace', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByRole('combobox', { name: /select period/i }), '3M');
    await user.click(screen.getByRole('button', { name: /open spending pace trend/i }));

    const today = new Date();
    const periodEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 2, 1);
    const expectedPeriod = `${periodStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

    expect(screen.getByText(`Calendar-month spending · ${expectedPeriod}`)).toBeInTheDocument();
  });

  it('shows an explicit empty state for a period without transactions', () => {
    const selectedMonth = new Date();
    selectedMonth.setDate(1);
    mockUseApp.mockReturnValue({
      transactions: [],
      monthlyBudget: 3000,
      selectedMonth,
    });

    renderPage();

    expect(screen.getByText('No activity in this period')).toBeInTheDocument();
    expect(screen.getByText(/Choose another period or add transactions/)).toBeInTheDocument();
  });
});
