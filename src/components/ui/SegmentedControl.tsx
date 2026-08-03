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
  tone?: 'primary' | 'positive';
  /**
   * Visual size variant:
   * - `default` — standard height (min-h-9)
   * - `compact` — reduced height (min-h-7) for use inside cards
   */
  size?: 'default' | 'compact';
  disabled?: boolean;
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
  tone = 'primary',
  size = 'default',
  disabled = false,
}: SegmentedControlProps<T>) {
  const activeLayoutId = React.useId();
  const activeToneClasses = tone === 'positive'
    ? 'bg-secondary shadow-secondary/15'
    : 'bg-primary shadow-primary/12';
  const activeTextClasses = tone === 'positive' ? 'text-surface' : 'text-on-primary';
  const focusToneClasses = tone === 'positive'
    ? 'focus-visible:ring-secondary/35'
    : 'focus-visible:ring-primary/30';

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      data-tone={tone}
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
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              // Base
              'relative flex-1 rounded-full px-4 font-bold transition-all duration-200 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100',
              'focus-visible:outline-none focus-visible:ring-2',
              focusToneClasses,
              // Size
              size === 'default' ? 'min-h-8 py-1.5 text-xs' : 'min-h-6 py-1 text-[10px]',
              // Active / inactive text colors
              isActive
                ? activeTextClasses
                : 'text-on-surface-variant hover:text-on-surface',
              optionClassName,
            )}
          >
            {isActive && (
              <motion.span
                layoutId={activeLayoutId}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className={cn('absolute inset-0 rounded-full shadow-sm', activeToneClasses)}
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
