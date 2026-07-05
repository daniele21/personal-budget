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
 * Reusable card container matching the app's compact Aura surface style.
 */
export function Card({ children, variant = 'default', className, as: Component = 'div', ...props }: CardProps) {
  return (
    <Component
      className={cn(
        'bg-surface-container-lowest rounded-2xl border border-outline-variant/25',
        variant === 'default' && 'p-4 shadow-[0_8px_24px_rgba(0,52,97,0.045)]',
        variant === 'elevated' && 'p-4 sm:p-5 shadow-[0_14px_38px_rgba(0,52,97,0.09)] border-outline-variant/30',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
