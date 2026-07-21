import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecurringExpense } from '../../types';
import { CalendarPage } from '../CalendarPage';
import { RecurringPage } from '../RecurringPage';

const mockUseApp = vi.fn();
const mockToast = vi.fn();

vi.mock('../../context/AppContext', () => ({ useApp: () => mockUseApp() }));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));

function currentRecurring(): RecurringExpense {
  const today = new Date();
  const startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const endDate = new Date(startDate);
  endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);

  return {
    id: 'rent',
    name: 'Rent',
    amount: 900,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    dayOfMonth: today.getDate(),
    category: 'Housing',
    type: 'expense',
    frequency: 'monthly',
    priority: true,
    reminder: { enabled: true, leadDays: 1 },
    overrides: [],
  };
}

function arrange(recurring: RecurringExpense[]) {
  const setRecurring = vi.fn();
  mockUseApp.mockReturnValue({
    transactions: [],
    setTransactions: vi.fn(),
    recurring,
    setRecurring,
    categories: ['Housing', 'Income'],
    addCategory: vi.fn(),
  });
  return setRecurring;
}

describe('Planning recurring operations', () => {
  beforeEach(() => {
    mockUseApp.mockReset();
    mockToast.mockReset();
  });

  it('deletes a recurring plan and exposes a working undo action', async () => {
    const user = userEvent.setup();
    const item = currentRecurring();
    const setRecurring = arrange([item]);

    render(<MemoryRouter><RecurringPage /></MemoryRouter>);

    await user.click(screen.getAllByRole('button', { name: /Rent/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(setRecurring).toHaveBeenCalledWith([]);
    const undoAction = mockToast.mock.calls.find(([message]) => message === 'Recurring bill removed')?.[3];
    expect(undoAction?.label).toBe('Undo');

    undoAction?.onClick();
    expect(setRecurring).toHaveBeenLastCalledWith([item]);
  });

  it('stores an occurrence edit as an override without changing the base series', async () => {
    const user = userEvent.setup();
    const item = currentRecurring();
    const setRecurring = arrange([item]);
    const today = new Date();

    render(<MemoryRouter><CalendarPage /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: String(today.getDate()) }));
    await user.click(screen.getAllByRole('button', { name: /Rent/ })[0]);
    await user.click(screen.getByRole('button', { name: /Only This Occurrence/ }));
    const name = screen.getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Adjusted rent');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(setRecurring).toHaveBeenCalledOnce();
    const saved = setRecurring.mock.calls[0][0][0] as RecurringExpense;
    expect(saved.name).toBe('Rent');
    expect(saved.amount).toBe(900);
    expect(saved.overrides).toEqual([
      expect.objectContaining({ title: 'Adjusted rent', amount: 900, category: 'Housing' }),
    ]);
  });

  it('excludes already elapsed recurring payments from the current-month summary', () => {
    const today = new Date();
    const monthStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
    const monthEnd = new Date(Date.UTC(today.getFullYear() + 1, today.getMonth(), 1));
    const pastPayment = {
      ...currentRecurring(),
      id: 'past',
      name: 'Already paid',
      amount: 100,
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      dayOfMonth: today.getDate() - 1,
    };
    const futurePayment = {
      ...currentRecurring(),
      id: 'future',
      name: 'Still due',
      amount: 250,
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      dayOfMonth: today.getDate() + 1,
    };
    arrange([pastPayment, futurePayment]);

    render(<MemoryRouter><CalendarPage /></MemoryRouter>);

    expect(screen.getByText('Remaining this month')).toBeInTheDocument();
    expect(screen.getAllByText('€250.00')).toHaveLength(2);
    expect(screen.getByText('1 recurring payment')).toBeInTheDocument();
    expect(screen.getAllByText('Still due')).toHaveLength(2);
  });
});
