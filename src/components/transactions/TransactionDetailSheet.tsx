import React from 'react';
import {
  CalendarDays,
  CreditCard,
  FileText,
  MessageSquarePlus,
  Pencil,
  Split,
  Tag,
  Trash2,
} from 'lucide-react';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { CategoryBadge } from '../ui/CategoryBadge';
import { BottomSheet, Button } from '../ui';
import { ExtraTransactionBadge } from '../ExtraTransactionBadge';
import { cn } from '../../lib/utils';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

/**
 * A single detail label + value row (no icon variant).
 * Used inside the compact detail grid of the bottom sheet.
 */
function DetailRow({
  label,
  value,
  icon,
  valueTone,
  className,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  valueTone?: 'default' | 'muted' | 'positive' | 'category';
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-2.5", className)}>
      {/* Label side */}
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
            {icon}
          </span>
        )}
        <span className="text-sm font-semibold text-on-surface-variant">{label}</span>
      </div>
      {/* Value side */}
      <span
        className={cn(
          'min-w-0 text-right text-sm font-bold',
          !valueClassName && 'truncate',
          valueTone === 'muted' && 'text-on-surface-variant',
          valueTone === 'positive' && 'text-secondary',
          (!valueTone || valueTone === 'default' || valueTone === 'category') && 'text-on-surface',
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Rich bottom sheet for transaction details, matching the Aura Finance mockup.
 *
 * Shows:
 *  - Category icon + amount + date header
 *  - Payment method, Category (with dot badge), Tags, Notes
 *  - "Add note" link
 *  - "Split transaction" secondary action (UI-only placeholder)
 *  - Delete + Edit footer buttons
 */
export function TransactionDetailSheet({
  transaction,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailSheetProps) {
  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const signedAmount = `${isIncome ? '+' : '-'}${formatCurrency(transaction.amount)}`;
  const dateLabel = new Date(`${transaction.date.slice(0, 10)}T00:00:00`).toLocaleDateString(
    'en-US',
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  );

  return (
    <BottomSheet
      isOpen={Boolean(transaction)}
      title={transaction.title || transaction.category}
      eyebrow="Transaction details"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => onDelete(transaction.id)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button className="flex-[2]" onClick={() => onEdit(transaction)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ── Hero: amount + category + date ── */}
        <div className="flex items-center gap-4 rounded-2xl bg-surface-container-low px-4 py-3">
          <CategoryBadge category={transaction.category} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate text-sm font-bold text-on-surface">
                {transaction.category}
              </p>
              <ExtraTransactionBadge transaction={transaction} />
            </div>
            <p className="mt-0.5 text-[10px] font-medium text-on-surface-variant">{dateLabel}</p>
          </div>
          <p
            className={cn(
              'shrink-0 font-headline text-xl font-extrabold tabular-nums',
              isIncome ? 'text-secondary' : 'text-on-surface',
            )}
          >
            {signedAmount}
          </p>
        </div>

        {/* ── Detail rows ── */}
        <div className="divide-y divide-outline-variant/25 rounded-2xl bg-surface-container-lowest px-3">
          <DetailRow
            label="Payment method"
            icon={<CreditCard className="h-3.5 w-3.5" />}
            value={transaction.paymentMethod || '—'}
            valueTone={transaction.paymentMethod ? 'default' : 'muted'}
          />
          <DetailRow
            label="Category"
            icon={<Tag className="h-3.5 w-3.5" />}
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: 'var(--color-accent-cyan)' }}
                />
                {transaction.category}
              </span>
            }
            valueTone="category"
          />
          <DetailRow
            label="Date"
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            value={dateLabel}
          />
          {transaction.description && (
            <DetailRow
              label="Note"
              icon={<FileText className="h-3.5 w-3.5" />}
              value={transaction.description}
              className="items-start"
              valueClassName="break-words whitespace-pre-wrap text-left text-xs font-semibold leading-relaxed"
            />
          )}
        </div>

        {/* ── Add note link (if no description yet) ── */}
        {!transaction.description && (
          <button
            type="button"
            onClick={() => onEdit(transaction)}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-outline-variant/40 px-3 py-2.5 text-left text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Add note
          </button>
        )}

        {/* ── Split transaction (UI placeholder) ── */}
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-primary transition-colors hover:bg-surface-container-low"
        >
          <Split className="h-4 w-4" />
          Split transaction
        </button>
      </div>
    </BottomSheet>
  );
}
