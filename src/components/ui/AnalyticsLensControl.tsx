import React from 'react';
import { AnalyticsLens, PrimaryAnalyticsLens } from '../../domain/finance';
import { cn } from '../../lib/utils';
import { SegmentedControl } from './SegmentedControl';

export type { PrimaryAnalyticsLens } from '../../domain/finance';

interface AnalyticsLensControlProps {
  value: AnalyticsLens;
  onChange: (value: AnalyticsLens) => void;
  mode?: 'compact' | 'full';
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
  className,
}: AnalyticsLensControlProps) {
  const options = mode === 'full' ? fullOptions : compactOptions;
  const resolvedValue = mode === 'compact' && value === 'extras' ? 'actual' : value;

  return (
    <div className={cn('inline-flex min-w-0 flex-col items-end gap-1', className)}>
      <SegmentedControl
        value={resolvedValue}
        options={options}
        onChange={onChange}
        ariaLabel="Analytics lens"
        size="compact"
        className={cn(
          'w-full bg-surface-container-lowest p-0.5 shadow-none',
          mode === 'compact' ? 'max-w-[7.5rem]' : 'max-w-full',
        )}
        optionClassName={mode === 'compact' ? 'px-2 text-[11px]' : 'px-2.5 text-[11px]'}
      />
      {resolvedValue === 'normalized' && (
        <span className="sr-only">Extra transactions are excluded from the displayed values.</span>
      )}
    </div>
  );
}
