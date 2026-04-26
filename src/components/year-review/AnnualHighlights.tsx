import React from 'react';
import { Trophy } from 'lucide-react';
import { AnnualReview } from '../../domain/finance';
import { formatCurrency } from '../../utils/formatters';

export function AnnualHighlights({ review }: { review: AnnualReview }) {
  return (
    <div className="rounded-3xl bg-primary text-on-primary p-5 shadow-lg shadow-primary/15">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5" />
        <p className="text-micro font-bold text-on-primary/75">Highlights</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-3xl font-extrabold">{review.savedMonths}/12</p>
          <p className="text-xs text-on-primary/75">months with positive net</p>
        </div>
        <div>
          <p className="text-3xl font-extrabold">{review.bestMonth?.label ?? 'n/a'}</p>
          <p className="text-xs text-on-primary/75">best month</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {review.highlights.map((item) => (
          <p key={item} className="text-sm text-on-primary/90">• {item}</p>
        ))}
        {review.biggestIncome && <p className="text-sm text-on-primary/90">• Biggest income: {formatCurrency(review.biggestIncome.amount)}.</p>}
      </div>
    </div>
  );
}
