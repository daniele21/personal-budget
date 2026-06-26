import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionQuickEditDialog } from '../TransactionQuickEditDialog';
import { Transaction } from '../../types';

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    amount: 120,
    type: 'expense',
    category: 'Travel',
    date: '2026-04-15T00:00:00.000Z',
    title: 'Train tickets',
    description: 'Weekend trip',
    paymentMethod: 'Credit Card',
    ...overrides,
  };
}

describe('TransactionQuickEditDialog', () => {
  it('saves manual transactions with the extra reporting flag', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <TransactionQuickEditDialog
        transaction={transaction()}
        categories={['Travel', 'Food']}
        onAddCategory={vi.fn()}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/mark as extra/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      reportingClass: 'extra',
      reportingNote: undefined,
    }));
  });

  it('saves income transactions with reimbursement instead of extra when selected', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <TransactionQuickEditDialog
        transaction={transaction({ type: 'income', category: 'Medical' })}
        categories={['Medical', 'Food']}
        onAddCategory={vi.fn()}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/mark as extra/i));
    await user.click(screen.getByLabelText(/mark as reimbursement/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      reportingClass: 'reimbursement',
      reportingNote: undefined,
    }));
  });

  it('does not expose or save extra reporting metadata for recurring-linked transactions', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <TransactionQuickEditDialog
        transaction={transaction({
          sourceRecurringId: 'rent',
          sourceMonthKey: '2026-04',
          reportingClass: 'extra',
          reportingNote: 'Legacy bad data',
        })}
        categories={['Travel', 'Housing']}
        onAddCategory={vi.fn()}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText(/mark as extra/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      reportingClass: undefined,
      reportingNote: undefined,
    }));
  });
});
