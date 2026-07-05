import React from 'react';
import { motion } from 'motion/react';
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
 * Active tab: sliding pill (bg-primary, white text)
 * Inactive tabs: no background, muted text
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
  const activeLayoutId = React.useId();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-surface-container-low p-1 border border-outline-variant/15',
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
              'relative flex-1 rounded-full px-4 font-bold transition-all duration-200 active:scale-[0.96]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              // Size
              size === 'default' ? 'min-h-8 py-1.5 text-xs' : 'min-h-6 py-1 text-[10px]',
              // Active / inactive text colors
              isActive
                ? 'text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface',
              optionClassName,
            )}
          >
            {isActive && (
              <motion.span
                layoutId={activeLayoutId}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute inset-0 rounded-full bg-primary shadow-sm shadow-primary/12"
              />
            )}
            <span className="relative z-10 inline-flex min-w-0 items-center justify-center gap-1.5">
              {option.icon}
              <span className="truncate">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
