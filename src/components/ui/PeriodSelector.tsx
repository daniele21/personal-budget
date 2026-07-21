import React, { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { AnalyticsLensControl } from './AnalyticsLensControl';
import type { AnalyticsLens } from '../../domain/finance';
import { normalizeDateRange } from '../../domain/finance';

export type RangeKey = '1M' | 'LM' | '3M' | '6M' | '12M' | 'CUSTOM';
export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '1M', label: 'This month' },
  { key: 'LM', label: 'Last month' },
  { key: '3M', label: '3M' },
  { key: '6M', label: '6M' },
  { key: '12M', label: '12M' },
  { key: 'CUSTOM', label: 'Custom period' },
];

export function getRangeDates(key: RangeKey, anchorYear: number, anchorMonth: number, customStart?: string, customEnd?: string) {
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let end: Date;
  let months: number = 1;

  if (key === 'CUSTOM' && customStart && customEnd) {
    const normalized = normalizeDateRange(
      `${customStart}T00:00:00`,
      `${customEnd}T00:00:00`,
    );
    start = normalized.start;
    end = normalized.end;
    const durationMs = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - durationMs);
  } else if (key === '1M') {
    end = new Date(anchorYear, anchorMonth + 1, 0, 23, 59, 59);
    start = new Date(anchorYear, anchorMonth, 1);
    prevEnd = new Date(anchorYear, anchorMonth, 0, 23, 59, 59);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    months = 1;
  } else if (key === 'LM') {
    end = new Date(anchorYear, anchorMonth, 0, 23, 59, 59);
    start = new Date(end.getFullYear(), end.getMonth(), 1);
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    months = 1;
  } else {
    end = new Date(anchorYear, anchorMonth + 1, 0, 23, 59, 59);
    months = key === '3M' ? 3 : key === '6M' ? 6 : 12;
    start = new Date(anchorYear, anchorMonth - months + 1, 1);
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth() - months + 1, 1);
  }

  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const periodLabel = `${startLabel} – ${endLabel}`;
  
  const comparisonLabel = months === 1 || key === 'CUSTOM'
    ? (key === 'CUSTOM'
        ? `${prevStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${prevEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : prevStart.toLocaleDateString('en-US', { month: 'short' }))
    : `${prevStart.toLocaleDateString('en-US', { month: 'short' })} – ${prevEnd.toLocaleDateString('en-US', { month: 'short' })}`;

  return { start, end, prevStart, prevEnd, periodLabel, comparisonLabel };
}

interface PeriodSelectorProps {
  range: RangeKey;
  lens: AnalyticsLens;
  customStartDate: string;
  customEndDate: string;
  periodLabel: string;
  onRangeChange: (range: RangeKey) => void;
  onLensChange: (lens: AnalyticsLens) => void;
  onCustomDatesChange: (startDate: string, endDate: string) => void;
  showLensControl?: boolean;
}

export function PeriodSelector({
  range,
  lens,
  customStartDate,
  customEndDate,
  periodLabel,
  onRangeChange,
  onLensChange,
  onCustomDatesChange,
  showLensControl = true,
}: PeriodSelectorProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [tempStart, setTempStart] = useState(customStartDate);
  const [tempEnd, setTempEnd] = useState(customEndDate);
  const customRangeValid = Boolean(tempStart)
    && Boolean(tempEnd)
    && new Date(`${tempStart}T00:00:00`) <= new Date(`${tempEnd}T00:00:00`);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextVal = e.target.value as RangeKey;
    if (nextVal === 'CUSTOM') {
      setIsSheetOpen(true);
    }
    onRangeChange(nextVal);
  };

  const handleApplyCustom = () => {
    if (!customRangeValid) return;
    setIsSheetOpen(false);
    onCustomDatesChange(tempStart, tempEnd);
  };

  return (
    <>
      <div className={cn('grid items-center gap-2', showLensControl ? 'grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)]' : 'grid-cols-2')}>
        <label className="relative min-w-0">
          <span className="sr-only">Select period</span>
          <select
            value={range}
            onChange={handleSelectChange}
            className={cn(
              'block h-8 w-full min-w-0 appearance-none rounded-full border border-outline-variant/20 bg-surface-container-lowest',
              'py-1 pl-3 pr-8 text-xs font-bold text-primary shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
            )}
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
        </label>

        {showLensControl && (
          <AnalyticsLensControl value={lens} onChange={onLensChange} className="mx-0 max-w-[9.25rem] shrink-0" />
        )}

        {range === 'CUSTOM' ? (
          <button
            onClick={() => {
              setTempStart(customStartDate);
              setTempEnd(customEndDate);
              setIsSheetOpen(true);
            }}
            className="ml-auto flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-full border border-primary bg-primary/5 px-2.5 py-1 hover:bg-primary/10 active:scale-[0.98] transition-transform"
          >
            <CalendarDays className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate text-[10px] font-bold text-primary">{periodLabel}</span>
          </button>
        ) : (
          <div className="ml-auto flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-full border border-outline-variant/25 bg-surface-container-lowest px-2.5 py-1">
            <CalendarDays className="h-3 w-3 shrink-0 text-on-surface-variant" />
            <span className="truncate text-[10px] font-bold text-on-surface-variant">{periodLabel}</span>
          </div>
        )}
      </div>

      <BottomSheet
        isOpen={isSheetOpen}
        title="Custom Period"
        subtitle="Choose a custom date range to analyze"
        onClose={() => setIsSheetOpen(false)}
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setIsSheetOpen(false)}
              className="flex-1 rounded-xl border border-outline-variant/30 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCustom}
              disabled={!customRangeValid}
              className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <Input
            type="date"
            label="Start Date"
            value={tempStart}
            onChange={(e) => setTempStart(e.target.value)}
          />
          <Input
            type="date"
            label="End Date"
            value={tempEnd}
            onChange={(e) => setTempEnd(e.target.value)}
          />
          {!customRangeValid && (
            <p className="text-xs font-semibold text-tertiary" role="alert">
              Start date must be on or before end date.
            </p>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
