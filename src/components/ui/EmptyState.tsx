import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Consistent empty state placeholder for lists/sections with no data.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-on-surface-variant/40 mb-4">{icon}</div>}
      <h3 className="font-headline font-bold text-on-surface-variant mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant/60 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
