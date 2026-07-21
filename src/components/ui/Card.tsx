import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  key?: React.Key;
  /**
   * Visual variant:
   * - `default`  — standard surface card (soft border + shadow)
   * - `elevated` — hero / summary card (stronger shadow for primary metrics)
   * - `inverse`  — dark focal surface for primary financial status
   * - `flat`     — section sub-area card (no border, tinted bg)
   */
  variant?: 'default' | 'elevated' | 'inverse' | 'flat';
  /** Semantic emphasis used by the shared gradient-border system. */
  tone?: 'neutral' | 'primary' | 'positive' | 'warning' | 'danger';
  /** Uses a more visible semantic wash for dashboard focal surfaces. */
  colorized?: boolean;
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
  tone,
  colorized = false,
  className,
  as: Component = 'div',
  ...props
}: CardProps) {
  const resolvedTone = tone ?? (variant === 'elevated' || variant === 'inverse' ? 'primary' : 'neutral');

  return (
    <Component
      className={cn(
        // Base padding shared across all variants
        'p-4',
        // Per-variant surface style
        variant === 'default' && 'aura-card',
        variant === 'elevated' && 'aura-card-elevated sm:p-5',
        variant === 'inverse' && 'aura-card-inverse sm:p-5',
        variant === 'flat' && 'aura-card-flat',
        (variant === 'default' || variant === 'elevated') && `aura-card-tone-${resolvedTone}`,
        variant === 'inverse' && `aura-card-inverse-tone-${resolvedTone}`,
        colorized && (variant === 'default' || variant === 'elevated') && 'aura-card-colorized',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
