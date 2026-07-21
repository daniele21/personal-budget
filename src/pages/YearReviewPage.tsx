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
import { Button, LensSelector } from '../components/ui';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatters';
import { pageTransition } from '../utils/motion';
import { cn } from '../lib/utils';

interface YearReviewPageProps {
  analyticsLens?: AnalyticsLens;
  onAnalyticsLensChange?: (lens: AnalyticsLens) => void;
  showLensControl?: boolean;
}

export function YearReviewPage({ analyticsLens: controlledLens, onAnalyticsLensChange, showLensControl = true }: YearReviewPageProps = {}) {
  const { transactions } = useApp();
  const { toast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [localLens, setLocalLens] = useState<AnalyticsLens>('actual');
  const analyticsLens = controlledLens ?? localLens;
  const setAnalyticsLens = onAnalyticsLensChange ?? setLocalLens;
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-micro font-bold text-on-surface-variant">Year in Review</p>
          <div className="flex items-center gap-2 mt-1">
            <button type="button" onClick={() => setYear((current) => current - 1)} className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center" aria-label="Previous year">
              <ChevronLeft className="w-4 h-4 text-primary" />
            </button>
            <h2 className="font-headline text-xl font-extrabold text-primary">{year}</h2>
            <button type="button" onClick={() => setYear((current) => current + 1)} className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center" aria-label="Next year">
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>

        {showLensControl && analyticsLens !== 'extras' && (
          <LensSelector
            value={analyticsLens}
            onChange={setAnalyticsLens}
            className="mx-0 max-w-[9.25rem] shrink-0"
          />
        )}
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
