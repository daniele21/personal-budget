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
 * Compact cash-flow chart with quiet tracks and semantic income/spend fills.
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
      {/* Rounded interval bars */}
      <div className="relative">
        <svg
          viewBox="0 0 320 100"
          className="h-24 w-full overflow-visible"
          role="img"
          aria-label={`Cash flow by interval for ${month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
        >
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.58" />
              <stop offset="100%" stopColor="var(--color-secondary)" />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.48" />
              <stop offset="100%" stopColor="var(--color-primary)" />
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
            opacity="0.42"
          />

          {intervals.map((interval, idx) => {
            const width = 10;
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
                  rx={5}
                  fill="var(--color-surface-container-high)"
                  opacity="0.62"
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
                  {/* Expense fill */}
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
        <div className="mt-1 flex justify-between px-1 text-[11px] font-medium text-on-surface-variant/70">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-end justify-between pt-1">
        <div>
          <p className={cn('font-headline text-xl font-bold tabular-nums leading-none tracking-tight', isPositive ? 'text-secondary' : 'text-on-surface')}>
            {isPositive ? '+' : ''}{formatCurrency(netAmount)}
          </p>
          <p className="mt-1.5 text-xs font-medium text-on-surface-variant">Net cash flow</p>
        </div>
        {momChange !== null && (
          <span className={cn('pb-0.5 text-xs font-semibold', momChange >= 0 ? 'text-secondary' : 'text-on-surface-variant')}>
            {momChange >= 0 ? '+' : ''}{momChange.toFixed(0)}% vs prev
          </span>
        )}
      </div>
    </div>
  );
}
