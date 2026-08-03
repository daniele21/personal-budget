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
  primary: 'bg-gradient-to-b from-primary-container to-primary text-on-primary shadow-md shadow-primary/12 hover:brightness-105 active:brightness-95 border border-primary/20',
  secondary: 'bg-surface-container-lowest text-primary border border-outline-variant/25 shadow-sm hover:bg-surface-container-low hover:text-primary-container active:bg-surface-container-high',
  ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary active:bg-surface-container-high',
  danger: 'bg-gradient-to-b from-tertiary to-[color-mix(in_srgb,var(--color-tertiary)_85%,var(--color-inverse-surface))] text-on-primary shadow-md shadow-tertiary/12 hover:brightness-105 active:brightness-95 border border-tertiary/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 text-xs rounded-lg',
  md: 'min-h-10 px-4 text-sm rounded-xl',
  lg: 'min-h-11 px-5 text-sm rounded-xl',
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
        'inline-flex items-center justify-center gap-2 text-center font-headline font-bold leading-tight transition-all duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50',
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
