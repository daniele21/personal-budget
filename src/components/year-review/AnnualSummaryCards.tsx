import React from 'react';
import { AnnualReview } from '../../domain/finance';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui';

export function AnnualSummaryCards({ review }: { review: AnnualReview }) {
  const netValue = `${review.totals.net >= 0 ? '+' : ''}${formatCurrency(review.totals.net)}`;
  const savingsRate = review.savingsRate === null ? 'n/a' : `${review.savingsRate.toFixed(0)}%`;

  return (
    <div className="space-y-3">
      <Card variant="inverse" tone={review.totals.net >= 0 ? 'positive' : 'danger'} className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-micro font-bold uppercase tracking-[0.12em] text-inverse-on-surface-variant">Annual result</p>
            <p className="truncate font-headline text-3xl font-extrabold tracking-tight text-inverse-on-surface">{netValue}</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/10 px-3 py-2 text-right ring-1 ring-inset ring-white/10">
            <p className="text-micro font-semibold text-inverse-on-surface-variant">Savings rate</p>
            <p className="font-headline text-lg font-extrabold text-inverse-positive">{savingsRate}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4" tone="positive">
          <p className="mb-2 text-micro font-bold text-on-surface-variant">Income</p>
          <p className="truncate text-xl font-extrabold text-secondary">{formatCurrency(review.totals.income)}</p>
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-micro font-bold text-on-surface-variant">Expenses</p>
          <p className="truncate text-xl font-extrabold text-on-surface">{formatCurrency(review.totals.expenses)}</p>
        </Card>
      </div>
    </div>
  );
}
