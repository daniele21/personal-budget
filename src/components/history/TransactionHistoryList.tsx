import React from 'react';
import { motion } from 'motion/react';
import { Paperclip, Search, Wallet } from 'lucide-react';
import { Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../utils/formatters';
import { CategoryBadge } from '../ui/CategoryBadge';
import { EmptyState } from '../ui';
import { SwipeableRow } from '../SwipeableRow';
import { staggerDelay } from '../../utils/motion';
import { ExtraTransactionBadge } from '../ExtraTransactionBadge';
import { groupTransactionsByDate } from '../../domain/transactionGrouping';

interface TransactionHistoryListProps {
  transactions: Transaction[];
  hasBaseTransactions: boolean;
  onOpenDetails: (transaction: Transaction) => void;
  onQuickEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

/**
 * Compact grouped transaction list matching the Aura Finance mockup.
 *
 * Layout per group:
 *   Today                           -€61,12   ← date group header
 *   [icon]  Caffè Milano  Food      €4,50     ← compact row (swipeable)
 *   [icon]  Supermercato  Grocery   €58,00
 *
 * Rows use a thin bottom divider (border-b) on the wrapper div instead of card borders.
 * The swipe layer is kept behind an opaque `bg-surface` so hints only show on gesture.
 */
export function TransactionHistoryList({
  transactions,
  hasBaseTransactions,
  onOpenDetails,
  onQuickEdit,
  onDelete,
}: TransactionHistoryListProps) {
  const groups = groupTransactionsByDate(transactions);
  let rowIndex = 0;

  if (groups.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-outline-variant/20 bg-surface-container-low">
        <EmptyState
          icon={hasBaseTransactions ? <Search className="h-10 w-10" /> : <Wallet className="h-10 w-10" />}
          title={hasBaseTransactions ? 'No transactions match the filters' : 'No transactions yet'}
          description={
            hasBaseTransactions
              ? 'Adjust search, categories, period, or sort to broaden the list.'
              : 'Add your first transaction to start building history.'
          }
          action={hasBaseTransactions ? undefined : { label: 'Add transaction', to: '/add' }}
        />
      </div>
    );
  }

  return (
    <section aria-label="Transaction history">
      {groups.map((group) => (
        <div key={group.key}>
          {/* ── Date group header ── */}
          <div className="tx-date-group">
            <span>{group.label}</span>
            <span
              className={cn(
                'tabular-nums',
                group.netTotal >= 0 ? 'text-secondary' : 'text-tertiary',
              )}
            >
              {group.netTotal >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(group.netTotal))}
            </span>
          </div>

          {/* ── Transaction rows ── */}
          {group.transactions.map((transaction) => {
            const index = rowIndex;
            rowIndex += 1;
            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: staggerDelay(index) }}
                // Apply the hairline divider at the wrapper level so SwipeableRow
                // sits inside a properly bordered container.
                className="border-b border-outline-variant/20 last:border-b-0"
              >
                <SwipeableRow
                  onEdit={() => onQuickEdit(transaction)}
                  onDelete={() => onDelete(transaction.id)}
                >
                  {/* Tap target — full-width button with the compact row layout */}
                  <button
                    type="button"
                    onClick={() => onOpenDetails(transaction)}
                    className="flex w-full items-center gap-2.5 px-1 py-2.5 text-left"
                  >
                    <CategoryBadge category={transaction.category} size="md" className="shrink-0" />

                    {/* Title + category */}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="min-w-0 truncate text-sm font-bold text-on-surface">
                          {transaction.title}
                        </p>
                        <ExtraTransactionBadge transaction={transaction} />
                      </div>
                      <p className="truncate text-[10px] font-medium text-on-surface-variant">
                        {transaction.category}
                      </p>
                    </div>

                    {/* Amount + attachment indicator */}
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          'text-sm font-extrabold tabular-nums',
                          transaction.type === 'income' ? 'text-secondary' : 'text-tertiary',
                        )}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                      {transaction.attachmentUrl && (
                        <Paperclip className="ml-auto mt-0.5 h-3 w-3 text-primary/40" />
                      )}
                    </div>
                  </button>
                </SwipeableRow>
              </motion.div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
