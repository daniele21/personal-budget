import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CashFlowPreviewProps {
  transactions: Transaction[];
  month: Date;
  netAmount: number;
  netMomChange: number | null;
}

export function CashFlowPreview({ transactions, month, netAmount, netMomChange }: CashFlowPreviewProps) {
  const points = useMemo(() => {
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const buckets = Array.from({ length: 8 }, () => 0);
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) return;
      const index = Math.min(7, Math.floor(((date.getDate() - 1) / days) * 8));
      buckets[index] += transaction.type === 'income' ? transaction.amount : -transaction.amount;
    });
    let running = 0;
    const cumulative = buckets.map((value) => (running += value));
    const min = Math.min(...cumulative, 0);
    const max = Math.max(...cumulative, 0);
    const range = Math.max(max - min, 1);
    return cumulative.map((value, index) => `${(index / 7) * 100},${34 - ((value - min) / range) * 28}`).join(' ');
  }, [month, transactions]);

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className={cn('font-headline text-2xl font-bold tabular-nums', netAmount >= 0 ? 'text-secondary' : 'text-on-surface')}>
          {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
        </p>
        <p className="text-xs text-on-surface-variant">Net cash flow</p>
        {netMomChange !== null && (
          <p className="mt-1 text-xs font-semibold text-on-surface-variant">
            {netMomChange >= 0 ? '+' : ''}{netMomChange.toFixed(0)}% vs previous month
          </p>
        )}
      </div>
      <svg viewBox="0 0 100 38" className="h-14 w-32 shrink-0" role="img" aria-label="Cash flow trend for the selected month">
        <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
