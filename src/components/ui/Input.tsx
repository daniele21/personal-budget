import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  className?: string;
}

/**
 * Styled text/number input matching the app's Material 3 surface style.
 */
export function Input({ label, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-micro font-bold text-on-surface-variant mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface shadow-sm shadow-primary/5 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20',
          className,
        )}
        {...props}
      />
    </div>
  );
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  options: { value: string; label: string }[];
  className?: string;
}

/**
 * Styled select dropdown matching the app's Material 3 surface style.
 */
export function Select({ label, options, className, id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="block text-micro font-bold text-on-surface-variant mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface shadow-sm shadow-primary/5 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20',
          className,
        )}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
