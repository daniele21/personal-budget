import React from 'react';
import { Paperclip, Search, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../utils/formatters';
import { CategoryBadge } from '../ui/CategoryBadge';
import { EmptyState } from '../ui';
import { SwipeableRow } from '../SwipeableRow';
import { staggerDelay } from '../../utils/motion';

interface TransactionHistoryListProps {
  transactions: Transaction[];
  hasBaseTransactions: boolean;
  onQuickEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionHistoryList({
  transactions,
  hasBaseTransactions,
  onQuickEdit,
  onDelete,
}: TransactionHistoryListProps) {
  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-headline font-extrabold text-lg">Transaction History</h3>
        </div>
        <div className="space-y-2">
          {transactions.length > 0 ? transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: staggerDelay(index) }}
            >
              <SwipeableRow onEdit={() => onQuickEdit(transaction)} onDelete={() => onDelete(transaction.id)}>
                <button
                  type="button"
                  onClick={() => onQuickEdit(transaction)}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl transition-all border border-outline-variant/5 hover:bg-surface-container-low active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <CategoryBadge category={transaction.category} size="md" className="flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-on-surface truncate">{transaction.title}</h4>
                      <p className="text-xs font-medium text-on-surface-variant line-clamp-1">{transaction.description}</p>
                      {transaction.reportingClass === 'extra' && !transaction.sourceRecurringId && (
                        <span className="mt-1 inline-flex w-fit rounded-full bg-accent-amber/10 px-2 py-0.5 text-micro font-extrabold text-accent-amber">
                          Extra{transaction.reportingNote ? `: ${transaction.reportingNote}` : ''}
                        </span>
                      )}
                      <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">
                        {new Date(transaction.date).toLocaleDateString()} - {transaction.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="flex flex-col items-end">
                      <p className={cn('text-sm font-extrabold', transaction.type === 'income' ? 'text-secondary' : 'text-on-surface')}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      {transaction.attachmentUrl && <Paperclip className="w-3 h-3 text-primary/40 mt-1" />}
                    </div>
                  </div>
                </button>
              </SwipeableRow>
            </motion.div>
          )) : (
            <div className="rounded-3xl bg-surface-container-low border border-dashed border-outline-variant/20">
              <EmptyState
                icon={hasBaseTransactions ? <Search className="w-10 h-10" /> : <Wallet className="w-10 h-10" />}
                title={hasBaseTransactions ? 'No transactions match the filters' : 'No transactions yet'}
                description={hasBaseTransactions ? 'Adjust search, categories, period, or sort to broaden the list.' : 'Add your first transaction to start building history.'}
                action={hasBaseTransactions ? undefined : { label: 'Add transaction', to: '/add' }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
