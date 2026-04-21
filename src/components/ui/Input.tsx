import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  className?: string;
}

/**
 * Styled text/number input matching the app's Material 3 surface style.
 */
export function Input({ label, className, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full bg-surface-container-high border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary',
          className,
        )}
        {...props}
      />
    </div>
  );
}

interface SelectProps {
  label?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  options: { value: string; label: string }[];
  className?: string;
}

/**
 * Styled select dropdown matching the app's Material 3 surface style.
 */
export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full bg-surface-container-high border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary',
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
