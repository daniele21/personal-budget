import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  key?: React.Key;
  /** Elevated variant adds extra shadow for hero/summary cards */
  variant?: 'default' | 'elevated';
  className?: string;
  as?: 'div' | 'section' | 'article';
}

/**
 * Reusable card container matching the app's Material 3 surface style.
 * Replaces all inline `bg-surface-container-lowest p-5 rounded-3xl ...` patterns.
 */
export function Card({ children, variant = 'default', className, as: Component = 'div', ...props }: CardProps) {
  return (
    <Component
      className={cn(
        'bg-surface-container-lowest rounded-3xl border border-outline-variant/5',
        variant === 'default' && 'p-5 shadow-sm',
        variant === 'elevated' && 'p-6 shadow-lg border-outline-variant/10',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
