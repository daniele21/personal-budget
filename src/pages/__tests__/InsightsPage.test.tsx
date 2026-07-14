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
    expect(screen.getByText('€3,500.00')).toBeInTheDocument();
    expect(screen.getByText('€700.00')).toBeInTheDocument();
    expect(screen.getAllByText('€2,800.00').length).toBeGreaterThan(0);
  });

  it('switches to net-of-extras totals', async () => {
    const user = userEvent.setup();
    renderPage();

    const netToggle = screen.getByRole('radio', { name: 'Net' });
    await user.click(netToggle);

    expect(netToggle).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Actual' })).not.toBeChecked();
    expect(screen.getByText('€3,000.00')).toBeInTheDocument();
    expect(screen.getByText('€100.00')).toBeInTheDocument();
    expect(screen.getAllByText('€2,900.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Excluded from Net: €600.00 expenses · €500.00 income')).toBeInTheDocument();
  });

  it('calculates safe to spend from the configured budget and selected lens expenses', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('€2,300.00')).toBeInTheDocument();
    expect(screen.getByText('of €3,000.00 safe limit')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Net' }));

    expect(screen.getAllByText('€2,900.00').length).toBeGreaterThan(1);
    expect(screen.getByText('of €3,000.00 safe limit')).toBeInTheDocument();
  });

  it('switches to extras-only totals and categories', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('radio', { name: 'Actual' }));

    expect(screen.getByText('Extras this period: €600.00 expenses · €500.00 income')).toBeInTheDocument();
    expect(screen.getByText('€3,500.00')).toBeInTheDocument();
    expect(screen.getByText('€700.00')).toBeInTheDocument();
    expect(screen.getAllByText('€2,800.00').length).toBeGreaterThan(0);
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
    expect(screen.getByText('1 May – 31 Jul')).toBeInTheDocument();
    expect(screen.getAllByText('€6,000.00').length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByRole('combobox', { name: /select period/i }), '6M');

    expect(screen.getByRole('combobox', { name: /select period/i })).toHaveValue('6M');
    expect(screen.getByText('1 Feb – 31 Jul')).toBeInTheDocument();
    expect(screen.getAllByText('€15,000.00').length).toBeGreaterThan(0);
  });

  it('handles moving average dynamic windows and manual override in bottom sheet', async () => {
    const user = userEvent.setup();
    renderPage();

    // 1. By default for 1M range (default), it should calculate 30d moving average
    // The main page callout button shows "Average Spending (30d)"
    const calloutButton = screen.getByRole('button', { name: /Average Spending \(30d\)/i });
    expect(calloutButton).toBeInTheDocument();

    // 2. Click callout button to open BottomSheet
    await user.click(calloutButton);

    // 3. Confirm BottomSheet shows "30-Day Moving Average" title
    expect(screen.getByRole('heading', { name: /30-Day Moving Average/i })).toBeInTheDocument();

    // 4. Verify segmented controls for window mode are present.
    // The active option should be "Auto (30d)"
    const autoOption = screen.getByRole('button', { name: /Auto \(30d\)/i });
    expect(autoOption).toBeInTheDocument();

    // 5. Click "7d" manual override button
    const sevenOption = screen.getByRole('button', { name: /^7d$/i });
    await user.click(sevenOption);

    // 6. Confirm title dynamically updates to "7-Day Moving Average"
    expect(screen.getByRole('heading', { name: /7-Day Moving Average/i })).toBeInTheDocument();

    // 7. Verify explanation text also updates (preceding 7 days)
    expect(screen.getByText(/preceding 7 days/i)).toBeInTheDocument();
  });
});
