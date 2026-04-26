import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Transaction } from '../../types';
import { DateRange, filterByDateRange, calculateTotals } from '../../domain/finance';
import { formatCurrency } from '../../utils/formatters';

function buildChartData(transactions: Transaction[], rangeA: DateRange, rangeB: DateRange) {
  return Array.from({ length: 6 }, (_, index) => {
    const sliceRange = (range: DateRange) => {
      const totalMs = range.end.getTime() - range.start.getTime();
      const start = new Date(range.start.getTime() + (totalMs / 6) * index);
      const end = new Date(range.start.getTime() + (totalMs / 6) * (index + 1));
      return calculateTotals(filterByDateRange(transactions, start, end)).expenses;
    };
    return {
      label: `${index + 1}`,
      A: sliceRange(rangeA),
      B: sliceRange(rangeB),
    };
  });
}

export function OverlayChart({ transactions, rangeA, rangeB }: { transactions: Transaction[]; rangeA: DateRange; rangeB: DateRange }) {
  const data = buildChartData(transactions, rangeA, rangeB);

  return (
    <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/5 p-4">
      <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-3">Expense trend overlay</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 16, border: 'none' }} />
            <Line type="monotone" dataKey="A" stroke="var(--color-primary)" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="B" stroke="var(--color-accent-amber)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary" /> Period A</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-accent-amber" /> Period B</span>
      </div>
    </div>
  );
}
