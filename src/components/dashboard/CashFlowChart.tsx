import React, { useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Transaction } from '../../types';
import { cn } from '../../lib/utils';
import * as Finance from '../../domain/finance';

interface CashFlowChartProps {
  /** All transactions for the selected month */
  transactions: Transaction[];
  /** Month being displayed */
  month: Date;
  /** Net amount for the month (income − expenses) */
  netAmount: number;
  /** Month-over-month % change (null = not available) */
  momChange: number | null;
  className?: string;
}

/**
 * Custom Cash Flow Overview chart showing dual-coloured rounded vertical pillars
 * matching the Aura Finance mockup design.
 */
export function CashFlowChart({
  transactions,
  month,
  netAmount,
  momChange,
  className,
}: CashFlowChartProps) {
  const intervals = useMemo(() => {
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const intervalLength = daysInMonth / 9;

    return Array.from({ length: 9 }, (_, idx) => {
      const startDay = Math.floor(idx * intervalLength) + 1;
      const endDay = Math.floor((idx + 1) * intervalLength);

      const intervalTx = transactions.filter((t) => {
        const d = new Date(t.date);
        const day = d.getDate();
        return (
          day >= startDay &&
          day <= endDay &&
          d.getMonth() === month.getMonth() &&
          d.getFullYear() === month.getFullYear()
        );
      });

      const totals = Finance.calculateTotals(intervalTx);
      return { income: totals.income, expenses: totals.expenses };
    });
  }, [transactions, month]);

  const maxVal = useMemo(() => {
    return Math.max(...intervals.map((i) => i.income + i.expenses), 1);
  }, [intervals]);

  const isPositive = netAmount >= 0;
  const monthName = month.toLocaleDateString('en-US', { month: 'short' });

  // Generate 5 labels representing weekly progression
  const labels = [
    `${monthName} 1`,
    `${monthName} 8`,
    `${monthName} 15`,
    `${monthName} 22`,
    `${monthName} 29`,
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Custom Rounded-Pill Bar Chart */}
      <div className="relative">
        <svg viewBox="0 0 320 100" className="w-full h-24 overflow-visible">
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="var(--color-secondary)" />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="var(--color-tertiary)" />
            </linearGradient>
          </defs>

          {/* Dashed Threshold Line */}
          <line
            x1="0"
            y1="40"
            x2="320"
            y2="40"
            stroke="var(--color-outline-variant)"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.6"
          />

          {intervals.map((interval, idx) => {
            const width = 12;
            const spacing = 32;
            const x = idx * spacing + 12;
            const chartHeight = 100;

            // Height proportions
            const expenseHeight = (interval.expenses / maxVal) * chartHeight;
            const incomeHeight = (interval.income / maxVal) * chartHeight;

            // Total height capped at chartHeight
            const totalHeight = Math.min(chartHeight, expenseHeight + incomeHeight);
            const cappedExpenseHeight = Math.min(totalHeight, expenseHeight);
            const cappedIncomeHeight = Math.max(0, totalHeight - cappedExpenseHeight);

            return (
              <g key={idx}>
                <defs>
                  <clipPath id={`bar-clip-${idx}`}>
                    <rect x={x} y={0} width={width} height={chartHeight} rx={6} />
                  </clipPath>
                </defs>

                {/* Gray Background Pillar Container */}
                <rect
                  x={x}
                  y={0}
                  width={width}
                  height={chartHeight}
                  rx={6}
                  fill="var(--color-surface-container-high)"
                  opacity="0.35"
                />

                {/* Color Fills inside clipPath */}
                <g clipPath={`url(#bar-clip-${idx})`}>
                  {/* Income Fill (Green gradient) */}
                  <rect
                    x={x}
                    y={chartHeight - cappedExpenseHeight - cappedIncomeHeight}
                    width={width}
                    height={cappedIncomeHeight}
                    fill="url(#incomeGrad)"
                  />
                  {/* Expense Fill (Blue gradient) */}
                  <rect
                    x={x}
                    y={chartHeight - cappedExpenseHeight}
                    width={width}
                    height={cappedExpenseHeight}
                    fill="url(#expenseGrad)"
                  />
                </g>
              </g>
            );
          })}
        </svg>

        {/* X-Axis labels centered to align with the 9 bars */}
        <div className="flex justify-between text-[8px] font-bold text-on-surface-variant/70 px-1 mt-1">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-end justify-between pt-1">
        <div>
          <p className={cn('font-headline text-lg font-extrabold tabular-nums leading-none', isPositive ? 'text-secondary' : 'text-primary')}>
            {isPositive ? '+' : ''}{formatCurrency(netAmount)}
          </p>
          <p className="text-[10px] font-bold text-on-surface-variant mt-1.5">Net cash flow</p>
        </div>
        {momChange !== null && (
          <span className={cn('text-[10px] font-bold pb-0.5', momChange >= 0 ? 'text-secondary' : 'text-tertiary')}>
            {momChange >= 0 ? '+' : ''}{momChange.toFixed(0)}% vs prev
          </span>
        )}
      </div>
    </div>
  );
}
