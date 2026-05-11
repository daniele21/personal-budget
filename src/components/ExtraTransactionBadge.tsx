import React from 'react';
import { Sparkles } from 'lucide-react';
import { getTransactionReportingClass } from '../domain/finance';
import { cn } from '../lib/utils';
import { Transaction } from '../types';

interface ExtraTransactionBadgeProps {
  transaction: Transaction;
  className?: string;
}

export function ExtraTransactionBadge({ transaction, className }: ExtraTransactionBadgeProps) {
  if (getTransactionReportingClass(transaction) !== 'extra') return null;

  const label = transaction.reportingNote ? `Extra: ${transaction.reportingNote}` : 'Extra';

  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-amber/10 text-accent-amber',
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
    </span>
  );
}
