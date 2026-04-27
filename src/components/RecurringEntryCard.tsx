import React from 'react';
import { Bell, Pencil, Trash2 } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency } from '../utils/formatters';
import { cn } from '../lib/utils';

interface RecurringEntryCardProps {
  amount: number;
  category: string;
  title: string;
  subtitle: string;
  className?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  reminderLabel?: string;
  variant?: 'default' | 'accent';
}

export const RecurringEntryCard: React.FC<RecurringEntryCardProps> = ({
  amount,
  category,
  className,
  onDelete,
  onEdit,
  reminderLabel,
  subtitle,
  title,
  variant = 'default',
}: RecurringEntryCardProps) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-3',
        variant === 'accent'
          ? 'border-primary/10 bg-primary/5'
          : 'border-outline-variant/5 bg-surface-container-lowest',
        className,
      )}
    >
      <CategoryIcon category={category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-on-surface">{title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-on-surface-variant">
          <span>{subtitle}</span>
          {reminderLabel && (
            <span className="inline-flex items-center gap-1 font-bold text-secondary">
              <Bell className="h-3 w-3" aria-hidden="true" />
              {reminderLabel}
            </span>
          )}
        </div>
      </div>
      <span className="text-sm font-bold text-primary">{formatCurrency(amount)}</span>
      {(onEdit || onDelete) && (
        <div className="flex gap-0.5">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full p-1.5 text-primary hover:bg-primary/10"
              aria-label={`Edit recurring item ${title}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full p-1.5 text-tertiary hover:bg-tertiary/10"
              aria-label={`Delete recurring item ${title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
