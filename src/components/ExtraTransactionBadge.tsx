import React from 'react';
import { ReceiptText, Sparkles } from 'lucide-react';
import { getTransactionReportingClass } from '../domain/finance';
import { cn } from '../lib/utils';
import { Transaction } from '../types';

interface ExtraTransactionBadgeProps {
  transaction: Transaction;
  className?: string;
}

export function ExtraTransactionBadge({ transaction, className }: ExtraTransactionBadgeProps) {
  const reportingClass = getTransactionReportingClass(transaction);
  if (reportingClass === 'regular') return null;

  const isReimbursement = reportingClass === 'reimbursement';
  const labelPrefix = isReimbursement ? 'Rimborso' : 'Extra';
  const label = transaction.reportingNote ? `${labelPrefix}: ${transaction.reportingNote}` : labelPrefix;
  const Icon = isReimbursement ? ReceiptText : Sparkles;

  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
        isReimbursement ? 'bg-secondary-container/35 text-secondary' : 'bg-accent-amber/10 text-accent-amber',
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
    </span>
  );
}
