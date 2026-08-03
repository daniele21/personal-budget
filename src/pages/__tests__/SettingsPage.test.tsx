import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPage } from '../SettingsPage';

const mocks = vi.hoisted(() => ({
  setMonthlyBudget: vi.fn(),
  setIsDarkMode: vi.fn(),
  setSavingsGoals: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    transactions: [],
    setTransactions: vi.fn(),
    budgets: [],
    setBudgets: vi.fn(),
    recurring: [],
    setRecurring: vi.fn(),
    categories: ['Housing', 'Groceries'],
    setCategories: vi.fn(),
    archivedCategories: [],
    setArchivedCategories: vi.fn(),
    savingsGoals: [
      { id: 'goal-1', name: 'Emergency Fund', targetAmount: 10000, currentAmount: 2500, createdAt: '2026-01-01' },
    ],
    setSavingsGoals: mocks.setSavingsGoals,
    monthlyBudget: 5000,
    setMonthlyBudget: mocks.setMonthlyBudget,
    isDarkMode: false,
    setIsDarkMode: mocks.setIsDarkMode,
  }),
}));

vi.mock('../../components/Toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('../../components/NotificationPreferences', () => ({ NotificationPreferences: () => <div>NotificationPreferences Component</div> }));

describe('SettingsPage', () => {
  it('renders settings sections correctly', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
    expect(screen.getByText('NotificationPreferences Component')).toBeInTheDocument();
    expect(screen.getByText('Savings goals')).toBeInTheDocument();
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
  });

  it('toggles dark mode', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    const switchBtn = screen.getByRole('switch', { name: 'Toggle dark mode' });
    await user.click(switchBtn);
    expect(mocks.setIsDarkMode).toHaveBeenCalledWith(true);
  });
});
