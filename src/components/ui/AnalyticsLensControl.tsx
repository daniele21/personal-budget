import React from 'react';
import { AnalyticsLens, PrimaryAnalyticsLens } from '../../domain/finance';
import { cn } from '../../lib/utils';
import { SegmentedControl } from './SegmentedControl';

import { InfoPopover } from './InfoPopover';

export type { PrimaryAnalyticsLens } from '../../domain/finance';

interface AnalyticsLensControlProps {
  value: AnalyticsLens;
  onChange: (value: AnalyticsLens) => void;
  mode?: 'compact' | 'full';
  showInfo?: boolean;
  className?: string;
}

const compactOptions = [
  { value: 'actual' as const, label: 'Actual', ariaLabel: 'Actual, includes extras' },
  { value: 'normalized' as const, label: 'Net', ariaLabel: 'Net of extras' },
];

const fullOptions = [
  { value: 'actual' as const, label: 'Actual', ariaLabel: 'Actual, includes extras' },
  { value: 'normalized' as const, label: 'Net of extras' },
  { value: 'extras' as const, label: 'Extras only' },
];

/**
 * Shared presentation for the reporting lens.
 *
 * The compact mode is intended for operational screens such as Home and
 * Budgets. Reports can use the full three-state mode without introducing a
 * separate interaction pattern.
 */
export function AnalyticsLensControl({
  value,
  onChange,
  mode = 'compact',
  showInfo = false,
  className,
}: AnalyticsLensControlProps) {
  const options = mode === 'full' ? fullOptions : compactOptions;
  const resolvedValue = mode === 'compact' && value === 'extras' ? 'actual' : value;

  return (
    <div
      data-tour-id="lens-selector"
      className={cn('inline-flex min-w-0 flex-col items-end gap-1', className)}
    >
      <div className="flex items-center gap-1.5 w-full">
        <SegmentedControl
          value={resolvedValue}
          options={options}
          onChange={onChange}
          ariaLabel="Analytics lens"
          size="compact"
          className={cn(
            'flex-1 bg-surface-container-lowest p-0.5 shadow-none',
            mode === 'compact' ? 'max-w-[7.5rem]' : 'max-w-full',
          )}
          optionClassName={mode === 'compact' ? 'px-2 text-[11px]' : 'px-2.5 text-[11px]'}
        />
        {showInfo && (
          <InfoPopover
            title="Actual vs Net of Extras"
            eyebrow="Spending View"
            subtitle="Choose how exceptional transactions are handled in totals."
          >
            <div className="space-y-3">
              <section className="rounded-2xl border border-primary/15 bg-primary/5 p-3.5">
                <h4 className="font-bold text-on-surface text-sm">Actual</h4>
                <p className="mt-1 text-on-surface-variant">
                  Includes all transactions without exception (regular spending plus one-off extra expenses or windfalls).
                </p>
              </section>

              <section className="rounded-2xl border border-secondary/20 bg-secondary-container/20 p-3.5">
                <h4 className="font-bold text-on-surface text-sm">Net of Extras</h4>
                <p className="mt-1 text-on-surface-variant">
                  Filters out non-recurring transactions marked as <strong>Extra</strong>. This gives a normalized view of your baseline monthly lifestyle and recurring spend.
                </p>
              </section>

              {mode === 'full' && (
                <section className="rounded-2xl border border-accent-amber/20 bg-accent-amber/10 p-3.5">
                  <h4 className="font-bold text-on-surface text-sm">Extras Only</h4>
                  <p className="mt-1 text-on-surface-variant">
                    Isolates only exceptional transactions (vacations, major repairs, large bonuses) to analyze non-routine cash flow.
                  </p>
                </section>
              )}
            </div>
          </InfoPopover>
        )}
      </div>
      {resolvedValue === 'normalized' && (
        <span className="sr-only">Extra transactions are excluded from the displayed values.</span>
      )}
    </div>
  );
}

