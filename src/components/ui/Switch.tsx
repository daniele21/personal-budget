import React from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}

export function Switch({ checked, onChange, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        checked
          ? 'border-secondary bg-secondary'
          : 'border-outline-variant/30 bg-surface-container-highest',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-1 top-1 h-5 w-5 rounded-full bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/10 transition-transform duration-200',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}
