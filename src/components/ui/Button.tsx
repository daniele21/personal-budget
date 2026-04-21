import React from 'react';
import { cn } from '../../lib/utils';

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
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-md active:scale-95',
  secondary: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
  ghost: 'text-on-surface-variant hover:bg-surface-variant/50',
  danger: 'bg-tertiary text-on-tertiary shadow-md active:scale-95',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-1.5 px-3 text-xs rounded-lg',
  md: 'py-2.5 px-4 text-sm rounded-xl',
  lg: 'py-3 px-5 text-sm rounded-xl',
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
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-bold transition-all',
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
