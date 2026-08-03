import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../../../types';
import { BatchToolbar } from '../BatchToolbar';
import { TransactionHistoryList } from '../TransactionHistoryList';

const transaction: Transaction = {
  id: 'tx-1',
  amount: 20,
  type: 'expense',
  category: 'Uncategorized',
  date: '2026-08-03T00:00:00.000Z',
  title: 'Local market',
  description: 'Local market',
  paymentMethod: 'Bank Transfer',
};

describe('history batch selection components', () => {
  it('toggles a transaction instead of opening details in selection mode', () => {
    const onToggleSelection = vi.fn();
    const onOpenDetails = vi.fn();
    render(
      <TransactionHistoryList
        transactions={[transaction]}
        hasBaseTransactions
        onOpenDetails={onOpenDetails}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        selectionMode
        selectedIds={new Set()}
        onToggleSelection={onToggleSelection}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select Local market' }));
    expect(onToggleSelection).toHaveBeenCalledWith('tx-1');
    expect(onOpenDetails).not.toHaveBeenCalled();
  });

  it('exposes select-visible, category change, clear and exit actions', () => {
    const onSelectVisible = vi.fn();
    const onChangeCategory = vi.fn();
    const onClear = vi.fn();
    const onExit = vi.fn();
    render(
      <BatchToolbar
        selectionMode
        selectedCount={2}
        visibleCount={3}
        categories={['Food', 'Travel']}
        batchCategory="Food"
        onBatchCategoryChange={vi.fn()}
        onChangeCategory={onChangeCategory}
        onSelectVisible={onSelectVisible}
        onClear={onClear}
        onExit={onExit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select visible' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done selecting' }));
    expect(onSelectVisible).toHaveBeenCalledOnce();
    expect(onChangeCategory).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledOnce();
  });
});
