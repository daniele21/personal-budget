import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionHistoryList } from '../TransactionHistoryList';
import { Transaction } from '../../../types';

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    amount: 300,
    type: 'expense',
    category: 'Home',
    date: '2026-04-10T00:00:00.000Z',
    title: 'New desk',
    description: 'Office setup',
    paymentMethod: 'Credit Card',
    ...overrides,
  };
}

describe('TransactionHistoryList', () => {
  it('shows an extra badge with the reporting note for manual extra transactions', () => {
    render(
      <TransactionHistoryList
        transactions={[transaction({ reportingClass: 'extra', reportingNote: 'Furniture' })]}
        hasBaseTransactions
        onQuickEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Extra: Furniture')).toBeInTheDocument();
  });

  it('does not show an extra badge for recurring-linked transactions even if stale data has the marker', () => {
    render(
      <TransactionHistoryList
        transactions={[transaction({
          sourceRecurringId: 'rent',
          sourceMonthKey: '2026-04',
          reportingClass: 'extra',
          reportingNote: 'Should be hidden',
        })]}
        hasBaseTransactions
        onQuickEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByText(/extra/i)).not.toBeInTheDocument();
  });
});
