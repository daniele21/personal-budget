import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { AnalyticsLens, comparePeriods, createMonthRange, filterByAnalyticsLens, normalizeDateRange } from '../domain/finance';
import { PeriodSelector } from '../components/compare/PeriodSelector';
import { ComparisonSummary } from '../components/compare/ComparisonSummary';
import { OverlayChart } from '../components/compare/OverlayChart';
import { CategoryDelta } from '../components/compare/CategoryDelta';
import { CompareInsights } from '../components/compare/CompareInsights';
import { pageTransition } from '../utils/motion';
import { cn } from '../lib/utils';

const ANALYTICS_LENSES: { key: AnalyticsLens; label: string }[] = [
  { key: 'actual', label: 'Actual' },
  { key: 'normalized', label: 'Net of extras' },
  { key: 'extras', label: 'Extras' },
];

export function ComparePage() {
  const { transactions } = useApp();
  const today = new Date();
  const [monthA, setMonthA] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthB, setMonthB] = useState(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const [preset, setPreset] = useState<'month' | 'quarter' | 'year'>('month');
  const [analyticsLens, setAnalyticsLens] = useState<AnalyticsLens>('actual');

  const ranges = useMemo(() => {
    if (preset === 'quarter') {
      return {
        a: normalizeDateRange(new Date(monthA.getFullYear(), monthA.getMonth() - 2, 1), new Date(monthA.getFullYear(), monthA.getMonth() + 1, 0), 'Period A quarter'),
        b: normalizeDateRange(new Date(monthB.getFullYear(), monthB.getMonth() - 2, 1), new Date(monthB.getFullYear(), monthB.getMonth() + 1, 0), 'Period B quarter'),
      };
    }
    if (preset === 'year') {
      return {
        a: normalizeDateRange(new Date(monthA.getFullYear(), 0, 1), new Date(monthA.getFullYear(), 11, 31), String(monthA.getFullYear())),
        b: normalizeDateRange(new Date(monthB.getFullYear(), 0, 1), new Date(monthB.getFullYear(), 11, 31), String(monthB.getFullYear())),
      };
    }
    return { a: createMonthRange(monthA.getFullYear(), monthA.getMonth()), b: createMonthRange(monthB.getFullYear(), monthB.getMonth()) };
  }, [monthA, monthB, preset]);

  const visibleTransactions = useMemo(() => filterByAnalyticsLens(transactions, analyticsLens), [transactions, analyticsLens]);
  const comparison = useMemo(() => comparePeriods(visibleTransactions, ranges.a, ranges.b), [visibleTransactions, ranges]);

  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">
      <section className="space-y-1">
        <p className="text-micro font-bold text-on-surface-variant">Compare</p>
        <h2 className="font-headline text-2xl font-extrabold text-primary">Period comparison</h2>
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
      <PeriodSelector monthA={monthA} monthB={monthB} onMonthAChange={setMonthA} onMonthBChange={setMonthB} onPreset={setPreset} />
      <ComparisonSummary comparison={comparison} />
      <OverlayChart transactions={visibleTransactions} rangeA={comparison.rangeA} rangeB={comparison.rangeB} />
      <CategoryDelta deltas={comparison.categoryDeltas} />
      <CompareInsights insights={comparison.insights} />
    </motion.div>
  );
}
