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
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icon && <div className="mb-3 rounded-xl bg-surface-container-low p-2.5 text-primary">{icon}</div>}
      <h3 className="font-headline font-bold text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant/70 max-w-xs">{description}</p>
      )}
      {actionNode && <div className="mt-3">{actionNode}</div>}
    </div>
  );
}
