import React from 'react';
import { cn } from '../lib/utils';

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
