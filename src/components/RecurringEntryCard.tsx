import React from 'react';
import { Bell, Pencil, Trash2 } from 'lucide-react';
import { CategoryBadge } from './ui/CategoryBadge';
import { formatCurrency } from '../utils/formatters';
import { cn } from '../lib/utils';
import { TransactionType } from '../types';

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
  type?: TransactionType;
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
  type,
}: RecurringEntryCardProps) => {
  return (
    <button
      onClick={onEdit}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl p-4 border text-left active:scale-[0.98] transition-all',
        variant === 'accent'
          ? 'border-primary/10 bg-primary/5'
          : 'border-outline-variant/5 bg-surface-container-lowest',
        className,
      )}
    >
      <CategoryBadge category={category} size="md" className="flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-on-surface">{title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-on-surface-variant/60 mt-0.5">
          <span>{subtitle}</span>
          {reminderLabel && (
            <span className="inline-flex items-center gap-1 font-bold text-secondary">
              <Bell className="h-3 w-3" aria-hidden="true" />
              {reminderLabel}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <div className="flex flex-col items-end">
          <span className={cn('text-sm font-extrabold', type === 'income' ? 'text-secondary' : 'text-on-surface')}>
            {type === 'income' ? '+' : '-'}{formatCurrency(amount)}
          </span>
        </div>
      </div>
    </button>
  );
};
