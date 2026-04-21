import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  /** Elevated variant adds extra shadow for hero/summary cards */
  variant?: 'default' | 'elevated';
  className?: string;
  [key: string]: unknown;
}

/**
 * Reusable card container matching the app's Material 3 surface style.
 * Replaces all inline `bg-surface-container-lowest p-5 rounded-3xl ...` patterns.
 */
export function Card({ children, variant = 'default', className }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-3xl border border-outline-variant/5',
        variant === 'default' && 'p-5 shadow-sm',
        variant === 'elevated' && 'p-6 shadow-lg border-outline-variant/10',
        className,
      )}
    >
      {children}
    </div>
  );
}
