import React from 'react';
import { AnnualReview } from '../../domain/finance';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../lib/utils';
import { Card } from '../ui';

export function AnnualSummaryCards({ review }: { review: AnnualReview }) {
  const cards = [
    { label: 'Income', value: formatCurrency(review.totals.income), color: 'text-secondary' },
    { label: 'Expenses', value: formatCurrency(review.totals.expenses), color: 'text-tertiary' },
    { label: 'Net', value: `${review.totals.net >= 0 ? '+' : ''}${formatCurrency(review.totals.net)}`, color: review.totals.net >= 0 ? 'text-secondary' : 'text-tertiary' },
    { label: 'Savings rate', value: review.savingsRate === null ? 'n/a' : `${review.savingsRate.toFixed(0)}%`, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <p className="text-micro font-bold text-on-surface-variant mb-2">{card.label}</p>
          <p className={cn('text-xl font-extrabold', card.color)}>{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
