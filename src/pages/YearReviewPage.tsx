import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnalyticsLens, filterByAnalyticsLens, getAnnualReview } from '../domain/finance';
import { AnnualSummaryCards } from '../components/year-review/AnnualSummaryCards';
import { MonthlyTrendChart } from '../components/year-review/MonthlyTrendChart';
import { AnnualHighlights } from '../components/year-review/AnnualHighlights';
import { SpendingHeatmap } from '../components/year-review/SpendingHeatmap';
import { CategoryShift } from '../components/year-review/CategoryShift';
import { Button } from '../components/ui';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatters';
import { pageTransition } from '../utils/motion';
import { cn } from '../lib/utils';

const ANALYTICS_LENSES: { key: AnalyticsLens; label: string }[] = [
  { key: 'actual', label: 'Actual' },
  { key: 'normalized', label: 'Net of extras' },
  { key: 'extras', label: 'Extras' },
];

export function YearReviewPage() {
  const { transactions } = useApp();
  const { toast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [analyticsLens, setAnalyticsLens] = useState<AnalyticsLens>('actual');
  const visibleTransactions = useMemo(() => filterByAnalyticsLens(transactions, analyticsLens), [transactions, analyticsLens]);
  const review = useMemo(() => getAnnualReview(visibleTransactions, year), [visibleTransactions, year]);

  const handleShare = async () => {
    const text = `Aura Finance ${year}: income ${formatCurrency(review.totals.income)}, expenses ${formatCurrency(review.totals.expenses)}, net ${formatCurrency(review.totals.net)}.`;
    if (navigator.share) {
      await navigator.share({ title: `Aura Finance ${year} Year in Review`, text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast('Year review summary copied', 'success');
  };

  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">
      <section className="space-y-3">
        <p className="text-micro font-bold text-on-surface-variant">Year in Review</p>
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setYear((current) => current - 1)} className="w-10 h-10 rounded-xl hover:bg-surface-container-low flex items-center justify-center" aria-label="Previous year">
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
          <h2 className="font-headline text-3xl font-extrabold text-primary">{year}</h2>
          <button type="button" onClick={() => setYear((current) => current + 1)} className="w-10 h-10 rounded-xl hover:bg-surface-container-low flex items-center justify-center" aria-label="Next year">
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
        </div>
      </section>

      <div className="flex items-center gap-1 bg-surface-container-high rounded-2xl p-1">
        {ANALYTICS_LENSES.map((lens) => (
          <button
            key={lens.key}
            onClick={() => setAnalyticsLens(lens.key)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              analyticsLens === lens.key ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            {lens.label}
          </button>
        ))}
      </div>

      <AnnualSummaryCards review={review} />
      <AnnualHighlights review={review} />
      <MonthlyTrendChart data={review.monthlyBreakdown} />
      <SpendingHeatmap data={review.heatmap} />
      <CategoryShift review={review} />
      <Button fullWidth variant="secondary" onClick={handleShare}>
        <Share2 className="w-4 h-4" /> Share summary
      </Button>
    </motion.div>
  );
}
