import React from 'react';
import { cn } from '../../lib/utils';

interface CompactMetricCardProps {
  label: string;
  value: React.ReactNode;
  /**
   * Optional trend indicator. Positive values show an upward arrow in green,
   * negative values show a downward arrow in amber/red. Pass `null` to hide.
   */
  trend?: number | null;
  /** Supplementary context label shown below the value (e.g. "vs Apr"). */
  context?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'primary' | 'positive' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

const toneClasses: Record<string, string> = {
  primary: 'text-primary bg-primary/10',
  positive: 'text-secondary bg-secondary/10',
  warning: 'text-accent-amber bg-accent-amber/10',
  danger: 'text-tertiary bg-tertiary/10',
  neutral: 'text-on-surface-variant bg-surface-container-high',
};

/**
 * Compact card for key metrics (e.g. Income, Spent, Remaining).
 *
 * Matches the Aura Finance mockup layout:
 *   [icon] Label
 *   €3,240
 *   ↑ +12% vs Apr   ← optional trend row
 */
export function CompactMetricCard({
  label,
  value,
  trend,
  context,
  icon,
  tone = 'neutral',
  className,
}: CompactMetricCardProps) {
  const hasTrend = typeof trend === 'number';
  const trendUp = hasTrend && trend >= 0;
  const trendLabel = hasTrend ? `${trendUp ? '+' : ''}${trend.toFixed(1)}%` : null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-3',
        'shadow-[0_2px_8px_rgba(0,52,97,0.04)]',
        className,
      )}
    >
      {/* Header: label + optional icon */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          {label}
        </p>
        {icon && (
          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg', toneClasses[tone])}>
            {icon}
          </span>
        )}
      </div>

      {/* Primary value */}
      <div className="font-headline text-base font-extrabold leading-none text-on-surface tabular-nums">
        {value}
      </div>

      {/* Trend + context row */}
      {(hasTrend || context) && (
        <div className="mt-1 flex items-center gap-1">
          {hasTrend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-bold',
                trendUp ? 'text-secondary' : 'text-tertiary',
              )}
              aria-label={`${trendUp ? 'Up' : 'Down'} ${Math.abs(trend!).toFixed(1)}%`}
            >
              {trendUp ? '↑' : '↓'} {trendLabel}
            </span>
          )}
          {context && (
            <span className="text-[10px] font-semibold text-on-surface-variant">{context}</span>
          )}
        </div>
      )}
    </div>
  );
}
