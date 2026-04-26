import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode | { label: string; to: string };
}

/**
 * Consistent empty state placeholder for lists/sections with no data.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const actionNode = action && typeof action === 'object' && 'label' in action && 'to' in action
    ? (
      <Link to={action.to}>
        <Button size="md">{action.label}</Button>
      </Link>
    )
    : action;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-on-surface-variant/40 mb-4">{icon}</div>}
      <h3 className="font-headline font-bold text-on-surface-variant mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant/60 max-w-xs">{description}</p>
      )}
      {actionNode && <div className="mt-4">{actionNode}</div>}
    </div>
  );
}
