import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressRowProps {
  label: string;
  /** Formatted amount spent string, e.g. "€420" */
  amount: React.ReactNode;
  /** Context detail, e.g. "€420 of €600" */
  detail: React.ReactNode;
  /** 0–100 */
  percent: number;
  icon?: React.ReactNode;
  /** Bar colour override — if omitted, falls back to state-based colour. */
  barColor?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Returns a Tailwind class for the progress bar based on usage percent,
 * used when no explicit barColor is provided.
 */
function getStateToneClass(percent: number): { bar: string; text: string; label: string } {
  if (percent >= 100) return { bar: 'bg-tertiary', text: 'text-tertiary', label: 'Over budget' };
  if (percent >= 90) return { bar: 'bg-accent-amber', text: 'text-accent-amber', label: 'Near limit' };
  if (percent >= 70) return { bar: 'bg-accent-cyan', text: 'text-primary', label: 'Attention' };
  return { bar: 'bg-secondary', text: 'text-secondary', label: 'On track' };
}

/**
 * A single budget category progress row matching the Aura Finance mockup layout:
 *
 *  [icon]  Label                    €420 of €600
 *  ████████████████░░░░░░░░░░░░░░░  70%
 *
 * When `barColor` is provided (hex / CSS var), it overrides the state-based colour,
 * letting each category have its own brand colour.
 */
export function ProgressRow({
  label,
  amount,
  detail,
  percent,
  icon,
  barColor,
  onClick,
  className,
}: ProgressRowProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const tone = getStateToneClass(percent);
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest',
        'p-3 text-left shadow-[0_1px_4px_rgba(0,52,97,0.04)] transition-all',
        onClick &&
          'hover:border-primary/20 hover:bg-surface-container-low active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        className,
      )}
    >
      {/* Row: icon + label + amounts */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon}
          <p className="truncate text-sm font-bold text-on-surface">{label}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-headline text-sm font-extrabold text-on-surface tabular-nums">
            {amount}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-on-surface-variant">{detail}</p>
        </div>
      </div>

      {/* Progress bar + percentage */}
      <div className="mt-2.5 flex items-center gap-2">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest"
          aria-label={`${label}: ${Math.round(percent)} percent`}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              !barColor && tone.bar,
            )}
            style={{
              width: `${clamped}%`,
              ...(barColor ? { background: barColor } : {}),
            }}
          />
        </div>
        <span className={cn('shrink-0 text-[10px] font-bold tabular-nums', tone.text)}>
          {Math.round(percent)}%
        </span>
      </div>
    </Component>
  );
}
