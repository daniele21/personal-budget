import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  key?: React.Key;
  /**
   * Visual variant:
   * - `default`  — standard surface card (soft border + shadow)
   * - `elevated` — hero / summary card (stronger shadow for primary metrics)
   * - `flat`     — section sub-area card (no border, tinted bg)
   */
  variant?: 'default' | 'elevated' | 'flat';
  className?: string;
  as?: 'div' | 'section' | 'article';
}

/**
 * Reusable card container matching the Aura Finance design system.
 *
 * Usage:
 *   <Card>…</Card>
 *   <Card variant="elevated">…</Card>
 *   <Card variant="flat">…</Card>
 */
export function Card({
  children,
  variant = 'default',
  className,
  as: Component = 'div',
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        // Base padding shared across all variants
        'p-4',
        // Per-variant surface style
        variant === 'default' && 'aura-card',
        variant === 'elevated' && 'aura-card-elevated sm:p-5',
        variant === 'flat' && 'aura-card-flat',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
