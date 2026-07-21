import React from 'react';
import { Card } from './Card';
import { cn } from '../../lib/utils';

interface FocalSummaryCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'positive' | 'warning' | 'danger';
  as?: 'div' | 'section' | 'article';
  className?: string;
}

/**
 * Shared semantic wrapper for the single primary financial answer on a screen.
 * Layout remains compositional so each page can express its own metric without
 * growing a prop-heavy dashboard abstraction.
 */
export function FocalSummaryCard({
  children,
  tone = 'primary',
  className,
  as = 'section',
  ...props
}: FocalSummaryCardProps) {
  return (
    <Card
      variant="inverse"
      tone={tone}
      as={as}
      className={cn('space-y-4', className)}
      {...props}
    >
      {children}
    </Card>
  );
}
