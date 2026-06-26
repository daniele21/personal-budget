import React from 'react';
import { cn } from '../lib/utils';
import { TransactionReportingClass, TransactionType } from '../types';

interface ExtraFlagToggleProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
}

export function ExtraFlagToggle({ checked, onChange, className }: ExtraFlagToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Mark as extra"
      onClick={onChange}
      className={cn(
        'group inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-2.5 text-micro font-extrabold transition-all active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        checked
          ? 'border-accent-amber/50 bg-accent-amber/15 text-accent-amber shadow-sm'
          : 'border-outline-variant/30 bg-surface-container-highest text-on-surface-variant hover:border-accent-amber/40 hover:bg-accent-amber/10 hover:text-on-surface',
        className,
      )}
    >
      Extra
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full transition-colors',
          checked ? 'bg-accent-amber' : 'bg-outline-variant group-hover:bg-accent-amber/70',
        )}
        aria-hidden="true"
      />
    </button>
  );
}

interface ReportingTreatmentToggleProps {
  value: TransactionReportingClass | undefined;
  type: TransactionType;
  onChange: (value: TransactionReportingClass | undefined) => void;
  className?: string;
}

export function ReportingTreatmentToggle({ value, type, onChange, className }: ReportingTreatmentToggleProps) {
  const canReimburse = type === 'income';
  const options: Array<{ value: TransactionReportingClass; label: string; ariaLabel: string }> = [
    { value: 'extra', label: 'Extra', ariaLabel: 'Mark as extra' },
    ...(canReimburse
      ? [{ value: 'reimbursement' as const, label: 'Rimborso', ariaLabel: 'Mark as reimbursement' }]
      : []),
  ];

  return (
    <div className={cn('inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-container-high p-1', className)}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.ariaLabel}
            onClick={() => onChange(selected ? undefined : option.value)}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center justify-center rounded-full border px-2.5 text-micro font-extrabold transition-all active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              selected && option.value === 'extra'
                ? 'border-accent-amber/50 bg-accent-amber/15 text-accent-amber shadow-sm'
                : selected
                  ? 'border-secondary/45 bg-secondary-container/35 text-secondary shadow-sm'
                  : 'border-transparent bg-transparent text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
