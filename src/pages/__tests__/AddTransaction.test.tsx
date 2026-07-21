import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AddTransaction } from '../AddTransaction';

const mockUseApp = vi.fn();

vi.mock('../../context/AppContext', () => ({ useApp: () => mockUseApp() }));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('idb-keyval', () => ({ get: vi.fn().mockResolvedValue(undefined), set: vi.fn(), del: vi.fn() }));

function renderPage(path = '/add') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/add" element={<AddTransaction />} />
        <Route path="/edit/:id" element={<AddTransaction />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AddTransaction progressive disclosure', () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue({
      transactions: [],
      setTransactions: vi.fn(),
      recurring: [],
      setRecurring: vi.fn(),
      categories: ['Food', 'Travel'],
      addCategory: vi.fn(),
    });
  });

  it('keeps advanced fields collapsed for a new expense and uses contextual CTA copy', async () => {
    const user = userEvent.setup();
    renderPage();

    const options = screen.getByRole('button', { name: /More options/i });
    expect(options).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Payment method')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as extra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save expense' })).toBeInTheDocument();

    await user.click(options);

    expect(options).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Payment method')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });

  it('opens advanced fields when editing meaningful existing values', () => {
    mockUseApp.mockReturnValue({
      transactions: [{
        id: 'tx-1',
        amount: 42,
        type: 'income',
        category: 'Travel',
        date: '2026-07-10T00:00:00.000Z',
        title: 'Refund',
        description: 'Delayed reimbursement',
        paymentMethod: 'Bank Transfer',
        reportingClass: 'reimbursement',
      }],
      setTransactions: vi.fn(),
      recurring: [],
      setRecurring: vi.fn(),
      categories: ['Food', 'Travel'],
      addCategory: vi.fn(),
    });

    renderPage('/edit/tx-1');

    expect(screen.getByRole('button', { name: /More options/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Mark as extra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as refund' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Payment method')).toHaveValue('Bank Transfer');
    expect(screen.getByRole('button', { name: 'Update income' })).toBeInTheDocument();
  });
});
