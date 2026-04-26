import React from 'react';
import { CheckSquare, Paperclip, Pencil, Search, Square, Trash2, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../utils/formatters';
import { CategoryIcon } from '../CategoryIcon';
import { EmptyState } from '../ui';
import { SwipeableRow } from '../SwipeableRow';
import { staggerDelay } from '../../utils/motion';

interface TransactionHistoryListProps {
  transactions: Transaction[];
  selectedIds: string[];
  hasBaseTransactions: boolean;
  onToggleSelected: (id: string) => void;
  onQuickEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionHistoryList({
  transactions,
  selectedIds,
  hasBaseTransactions,
  onToggleSelected,
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
                <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl transition-colors border border-outline-variant/5">
                  <button
                    type="button"
                    onClick={() => onToggleSelected(transaction.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      onToggleSelected(transaction.id);
                    }}
                    className="mr-3 rounded-xl p-1.5 text-primary hover:bg-primary/10"
                    aria-label={selectedIds.includes(transaction.id) ? `Deselect ${transaction.title || transaction.category}` : `Select ${transaction.title || transaction.category}`}
                  >
                    {selectedIds.includes(transaction.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                      <CategoryIcon category={transaction.category} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-on-surface truncate">{transaction.title}</h4>
                      <p className="text-xs font-medium text-on-surface-variant line-clamp-1">{transaction.description}</p>
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
                    <button
                      onClick={() => onQuickEdit(transaction)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all"
                      aria-label={`Quick edit transaction ${transaction.title || transaction.category}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(transaction.id)}
                      className="p-2 text-tertiary hover:bg-tertiary/10 rounded-full transition-all"
                      aria-label={`Delete transaction ${transaction.title || transaction.category}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
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
