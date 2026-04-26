import React from 'react';
import { DailySpending } from '../../domain/finance';
import { formatCurrency } from '../../utils/formatters';

const COLORS = [
  'var(--color-surface-container-high)',
  'color-mix(in srgb, var(--color-secondary) 25%, transparent)',
  'color-mix(in srgb, var(--color-secondary) 45%, transparent)',
  'color-mix(in srgb, var(--color-secondary) 70%, transparent)',
  'var(--color-secondary)',
];

export function SpendingHeatmap({ data }: { data: DailySpending[] }) {
  return (
    <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/5 p-4 overflow-hidden">
      <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-3">Daily spending heatmap</p>
      <div className="overflow-x-auto pb-2">
        <svg width="740" height="112" role="img" aria-label="Daily spending heatmap">
          {data.map((day, index) => {
            const week = Math.floor(index / 7);
            const weekday = index % 7;
            return (
              <rect
                key={day.date}
                x={week * 14}
                y={weekday * 14}
                width="10"
                height="10"
                rx="3"
                fill={COLORS[day.intensity]}
              >
                <title>{day.date}: {formatCurrency(day.amount)}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-on-surface-variant">
        <span>Less</span>
        {COLORS.map((color) => <span key={color} className="w-3 h-3 rounded-[4px]" style={{ background: color }} />)}
        <span>More</span>
      </div>
    </div>
  );
}
