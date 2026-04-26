import React from 'react';
import { cn } from '../../lib/utils';
import { haptics } from '../../utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  'aria-label'?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-md shadow-primary/15 hover:bg-primary-container',
  secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
  ghost: 'text-on-surface-variant hover:bg-surface-container-low',
  danger: 'bg-tertiary text-on-primary shadow-md shadow-tertiary/15 hover:bg-tertiary-container',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-xs rounded-lg',
  md: 'min-h-11 px-4 text-sm rounded-xl',
  lg: 'min-h-12 px-5 text-sm rounded-xl',
};

/**
 * Reusable button with consistent styling across the app.
 */
export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      onClick={(event) => {
        haptics.tap();
        onClick?.(event);
      }}
      className={cn(
        'inline-flex items-center justify-center gap-2 text-center font-headline font-extrabold leading-tight transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
