import React from 'react';
import { cn } from '../../lib/utils';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Array<SegmentedControlOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  optionClassName?: string;
  ariaLabel: string;
  /**
   * Visual size variant:
   * - `default` — standard height (min-h-9)
   * - `compact` — reduced height (min-h-7) for use inside cards
   */
  size?: 'default' | 'compact';
}

/**
 * Pill-shaped segmented control matching the Aura Finance mockup tab style.
 *
 * Active tab: dark pill (bg-primary, white text)
 * Inactive tabs: no background, muted text
 *
 * Usage:
 *   <SegmentedControl
 *     value={tab}
 *     options={[{ value: 'all', label: 'All' }, ...]}
 *     onChange={setTab}
 *     ariaLabel="Filter transactions"
 *   />
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  optionClassName,
  ariaLabel,
  size = 'default',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-surface-container-high p-1',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.ariaLabel ?? option.label}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              // Base
              'flex-1 rounded-full px-4 font-bold transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              // Size
              size === 'default' ? 'min-h-8 py-1.5 text-xs' : 'min-h-6 py-1 text-[10px]',
              // Active / inactive
              isActive
                ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
              optionClassName,
            )}
          >
            <span className="inline-flex min-w-0 items-center justify-center gap-1.5">
              {option.icon}
              <span className="truncate">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
