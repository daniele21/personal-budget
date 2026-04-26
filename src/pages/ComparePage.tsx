import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { comparePeriods, createMonthRange, normalizeDateRange } from '../domain/finance';
import { PeriodSelector } from '../components/compare/PeriodSelector';
import { ComparisonSummary } from '../components/compare/ComparisonSummary';
import { OverlayChart } from '../components/compare/OverlayChart';
import { CategoryDelta } from '../components/compare/CategoryDelta';
import { CompareInsights } from '../components/compare/CompareInsights';

export function ComparePage() {
  const { transactions } = useApp();
  const today = new Date();
  const [monthA, setMonthA] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthB, setMonthB] = useState(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const [preset, setPreset] = useState<'month' | 'quarter' | 'year'>('month');

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

  const comparison = useMemo(() => comparePeriods(transactions, ranges.a, ranges.b), [transactions, ranges]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 pb-24">
      <section className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Compare</p>
        <h2 className="font-headline text-2xl font-extrabold text-primary">Period comparison</h2>
      </section>
      <PeriodSelector monthA={monthA} monthB={monthB} onMonthAChange={setMonthA} onMonthBChange={setMonthB} onPreset={setPreset} />
      <ComparisonSummary comparison={comparison} />
      <OverlayChart transactions={transactions} rangeA={comparison.rangeA} rangeB={comparison.rangeB} />
      <CategoryDelta deltas={comparison.categoryDeltas} />
      <CompareInsights insights={comparison.insights} />
    </motion.div>
  );
}
