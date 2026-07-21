import React from 'react';
import { FocalSummaryCard } from '../ui';
import { formatCurrency } from '../../utils/formatters';
import { formatUtcDateLabel } from '../../domain/recurring';

interface NextPayment {
  name: string;
  date: Date;
  amount: number;
}

interface CalendarMonthSummaryProps {
  total: number;
  count: number;
  nextPayment?: NextPayment;
  period: 'past' | 'current' | 'future';
}

export function CalendarMonthSummary({ total, count, nextPayment, period }: CalendarMonthSummaryProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = nextPayment && period !== 'past'
    ? Math.max(0, Math.round((Date.UTC(
      nextPayment.date.getUTCFullYear(),
      nextPayment.date.getUTCMonth(),
      nextPayment.date.getUTCDate(),
    ) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000))
    : null;
  const urgencyClass = daysUntil !== null && daysUntil <= 3
    ? 'text-inverse-danger'
    : daysUntil !== null && daysUntil <= 7
      ? 'text-inverse-warning'
      : 'text-inverse-on-surface-variant';

  return (
    <FocalSummaryCard tone={daysUntil !== null && daysUntil <= 3 ? 'danger' : daysUntil !== null && daysUntil <= 7 ? 'warning' : 'primary'}>
      <div>
        <p className="text-xs font-semibold text-inverse-on-surface-variant">
          {period === 'past'
            ? 'Scheduled in this month'
            : period === 'current'
              ? 'Remaining this month'
              : 'Scheduled for this month'}
        </p>
        <p className="mt-1 font-headline text-4xl font-extrabold tabular-nums text-inverse-on-surface">
          {formatCurrency(total)}
        </p>
        <p className="mt-1 text-xs text-inverse-on-surface-variant">
          {count} recurring {count === 1 ? 'payment' : 'payments'}
        </p>
      </div>

      {nextPayment && (
        <div className="flex items-end justify-between gap-3 border-t border-white/12 pt-3">
          <div className="min-w-0">
            <p className="text-micro font-bold uppercase tracking-wide text-inverse-on-surface-variant">
              {period === 'past' ? 'First scheduled' : 'Next up'}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-inverse-on-surface">{nextPayment.name}</p>
            <p className={`mt-0.5 text-xs font-semibold ${urgencyClass}`}>
              {formatUtcDateLabel(nextPayment.date.toISOString(), 'en-US')}
              {daysUntil !== null && period !== 'past'
                ? ` · ${daysUntil === 0 ? 'due today' : `due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`}`
                : ''}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold tabular-nums text-inverse-on-surface">{formatCurrency(nextPayment.amount)}</p>
        </div>
      )}
    </FocalSummaryCard>
  );
}
