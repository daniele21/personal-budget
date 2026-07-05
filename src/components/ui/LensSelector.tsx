import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface LensSelectorProps {
  value: 'actual' | 'normalized';
  onChange: (value: 'actual' | 'normalized') => void;
  className?: string;
}

export function LensSelector({ value, onChange, className }: LensSelectorProps) {
  const normalizedSelected = value === 'normalized';
  const groupName = React.useId();
  const netId = React.useId();
  const actualId = React.useId();

  return (
    <fieldset
      aria-label="Analytics lens"
      className={cn("grid h-8 w-full max-w-[10rem] grid-cols-2 items-center gap-1 rounded-full border border-outline-variant/15 bg-surface-container-low p-1 mx-auto", className)}
    >
      <legend className="sr-only">Analytics lens</legend>
      <input
        id={netId}
        name={groupName}
        type="radio"
        value="normalized"
        checked={normalizedSelected}
        onChange={() => onChange('normalized')}
        className="sr-only"
      />
      <label
        htmlFor={netId}
        aria-label="Net"
        aria-pressed={normalizedSelected}
        className={cn(
          "relative inline-flex h-6 min-w-0 cursor-pointer select-none items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-semibold leading-none transition-all duration-200 active:scale-[0.96]",
          "has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/25",
          normalizedSelected
            ? "text-primary font-bold"
            : "text-on-surface-variant hover:text-on-surface"
        )}
      >
        {normalizedSelected && (
          <motion.span
            layoutId="active-lens"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute inset-0 rounded-full border border-outline-variant/20 bg-surface-container-lowest shadow-sm"
          />
        )}
        <ShieldCheck className={cn("h-3.5 w-3.5 shrink-0 transition-colors z-10", normalizedSelected ? "text-primary" : "text-on-surface-variant/70")} />
        <span className="z-10">Net</span>
        <span className="sr-only">Regular budget</span>
      </label>

      <input
        id={actualId}
        name={groupName}
        type="radio"
        value="actual"
        checked={!normalizedSelected}
        onChange={() => onChange('actual')}
        className="sr-only"
      />
      <label
        htmlFor={actualId}
        aria-label="Actual"
        aria-pressed={!normalizedSelected}
        className={cn(
          "relative inline-flex h-6 min-w-0 cursor-pointer select-none items-center justify-center gap-1 rounded-full px-1.5 text-[11px] font-semibold leading-none transition-all duration-200 active:scale-[0.96]",
          "has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/25",
          normalizedSelected
            ? "text-on-surface-variant hover:text-on-surface"
            : "text-accent-amber font-bold"
        )}
      >
        {!normalizedSelected && (
          <motion.span
            layoutId="active-lens"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute inset-0 rounded-full border border-outline-variant/20 bg-surface-container-lowest shadow-sm"
          />
        )}
        <Sparkles className={cn("h-3.5 w-3.5 shrink-0 transition-colors z-10", normalizedSelected ? "text-on-surface-variant/70" : "text-accent-amber")} />
        <span className="z-10">Actual</span>
        <span className="sr-only">Total spend</span>
      </label>
    </fieldset>
  );
}
