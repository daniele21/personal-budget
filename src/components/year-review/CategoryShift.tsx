import React from 'react';
import { AnnualReview } from '../../domain/finance';
import { CategoryIcon } from '../CategoryIcon';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../lib/utils';
import { Card } from '../ui';

export function CategoryShift({ review }: { review: AnnualReview }) {
  const shifts = review.categoryShifts.slice(0, 6);

  return (
    <Card className="space-y-4 p-4">
      <p className="text-micro font-bold text-on-surface-variant">Category shifts vs previous year</p>
      {shifts.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No previous year data to compare.</p>
      ) : shifts.map((shift) => (
        <div key={shift.category} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CategoryIcon category={shift.category} className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{shift.category}</p>
              <p className="text-micro text-on-surface-variant">{formatCurrency(shift.current)} vs {formatCurrency(shift.previous)}</p>
            </div>
          </div>
          <p className={cn('text-xs font-bold', shift.delta <= 0 ? 'text-secondary' : 'text-tertiary')}>
            {shift.delta >= 0 ? '+' : ''}{formatCurrency(shift.delta)}
          </p>
        </div>
      ))}
    </Card>
  );
}
