/**
 * ReviewStep — Third step of the import wizard.
 *
 * Displays all categorized transactions in a scrollable list.
 * Each row shows the original description, AI-assigned category
 * (with confidence indicator), amount, and type.
 *
 * The user can:
 * - Change the category for any transaction via a CategoryPicker
 * - Toggle expense/income type
 * - Edit the title
 * - Deselect transactions they don't want to import
 */
import React, { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X, Pencil, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CategoryBadge } from '../ui/CategoryBadge';
import { CategoryIcon } from '../CategoryIcon';
import { CategoryPicker } from '../CategoryPicker';
import { NumericKeypadModal } from '../NumericKeypadModal';
import { APP_CONFIG } from '../../constants';
import type { CategorizedTransaction } from '../../domain/transactionCategorizer';

interface ReviewStepProps {
  transactions: CategorizedTransaction[];
  categories: string[];
  onTransactionsUpdated: (transactions: CategorizedTransaction[]) => void;
  onAddCategory: (name: string) => void;
}

/** Confidence badge colors */
const CONFIDENCE_STYLES = {
  high: 'bg-secondary/10 text-secondary',
  medium: 'bg-accent-amber/10 text-accent-amber',
  low: 'bg-tertiary/10 text-tertiary',
} as const;

export function ReviewStep({
  transactions,
  categories,
  onTransactionsUpdated,
  onAddCategory,
}: ReviewStepProps) {
  /** Index of the row currently being edited in the dialog */
  const [editingTxIndex, setEditingTxIndex] = useState<number | null>(null);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  const selectedCount = transactions.filter(t => !t.isDeselected).length;

  /** Toggle selection for a row */
  const toggleSelection = useCallback((index: number) => {
    const updated = transactions.map((t) =>
      t.index === index ? { ...t, isDeselected: !t.isDeselected } : t,
    );
    onTransactionsUpdated(updated);
  }, [transactions, onTransactionsUpdated]);

  const allDeselected = transactions.every(t => t.isDeselected);
  const toggleAll = useCallback(() => {
    const nextState = !allDeselected;
    const updated = transactions.map(t => ({ ...t, isDeselected: nextState }));
    onTransactionsUpdated(updated);
  }, [transactions, allDeselected, onTransactionsUpdated]);

  /** Update category for a specific row */
  const updateCategory = useCallback((rowIndex: number, category: string) => {
    const updated = transactions.map((t) =>
      t.index === rowIndex ? { ...t, category, confidence: 'high' as const } : t,
    );
    onTransactionsUpdated(updated);
  }, [transactions, onTransactionsUpdated]);

  /** Update type for a specific row */
  const updateType = useCallback((rowIndex: number, type: 'expense' | 'income') => {
    const updated = transactions.map((t) =>
      t.index === rowIndex ? { ...t, type } : t,
    );
    onTransactionsUpdated(updated);
  }, [transactions, onTransactionsUpdated]);

  /** Update title for a specific row */
  const updateTitle = useCallback((rowIndex: number, title: string) => {
    const updated = transactions.map((t) =>
      t.index === rowIndex ? { ...t, title } : t,
    );
    onTransactionsUpdated(updated);
  }, [transactions, onTransactionsUpdated]);

  const updateAmount = useCallback((rowIndex: number, amount: number) => {
    const updated = transactions.map((t) =>
      t.index === rowIndex ? { ...t, amount } : t,
    );
    onTransactionsUpdated(updated);
  }, [transactions, onTransactionsUpdated]);

  const updateDate = useCallback((rowIndex: number, date: string) => {
    const updated = transactions.map((t) =>
      t.index === rowIndex ? { ...t, date } : t,
    );
    onTransactionsUpdated(updated);
  }, [transactions, onTransactionsUpdated]);

  const updateDescription = useCallback((rowIndex: number, description: string) => {
    const updated = transactions.map((t) =>
      t.index === rowIndex ? { ...t, description } : t,
    );
    onTransactionsUpdated(updated);
  }, [transactions, onTransactionsUpdated]);

  /** Statistics */
  const stats = useMemo(() => {
    const selected = transactions.filter((t) => !t.isDeselected);
    return {
      total: transactions.length,
      selected: selected.length,
      highConfidence: selected.filter((t) => t.confidence === 'high').length,
      mediumConfidence: selected.filter((t) => t.confidence === 'medium').length,
      lowConfidence: selected.filter((t) => t.confidence === 'low').length,
    };
  }, [transactions]);

  const editingTx = useMemo(() => {
    if (editingTxIndex === null) return null;
    return transactions.find(t => t.index === editingTxIndex) || null;
  }, [transactions, editingTxIndex]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
        <div className="space-y-0.5">
          <h3 className="font-headline font-bold text-on-surface text-base">Review Categories</h3>
          <p className="text-xs text-on-surface-variant">
            AI has categorized your transactions. Review and adjust as needed.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-bold text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors shrink-0"
        >
          {allDeselected ? 'Select All' : 'Deselect All'}
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="px-3 py-1.5 rounded-full bg-surface-container-high text-micro font-bold text-on-surface">
          {stats.selected}/{stats.total} selected
        </span>
        <span className={cn('px-3 py-1.5 rounded-full text-micro font-bold', CONFIDENCE_STYLES.high)}>
          {stats.highConfidence} high
        </span>
        <span className={cn('px-3 py-1.5 rounded-full text-micro font-bold', CONFIDENCE_STYLES.medium)}>
          {stats.mediumConfidence} med
        </span>
        {stats.lowConfidence > 0 && (
          <span className={cn('px-3 py-1.5 rounded-full text-micro font-bold', CONFIDENCE_STYLES.low)}>
            {stats.lowConfidence} low
          </span>
        )}
      </div>

      {/* Transaction list */}
      <div className="space-y-1.5 pb-2">
        {transactions.map((tx) => {
          const isDeselected = !!tx.isDeselected;

          return (
            <div
              key={tx.index}
              className={cn(
                'rounded-2xl border transition-all duration-200',
                isDeselected
                  ? 'bg-surface-container-high/50 border-outline-variant/5 opacity-50'
                  : 'bg-surface-container-lowest border-outline-variant/10',
              )}
            >
              {/* Main row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Selection checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelection(tx.index)}
                  className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all border',
                    isDeselected
                      ? 'border-outline-variant/30 bg-transparent'
                      : 'border-primary bg-primary',
                  )}
                  aria-label={isDeselected ? 'Select transaction' : 'Deselect transaction'}
                >
                  {!isDeselected && <Check className="w-3.5 h-3.5 text-on-primary" />}
                </button>

                {/* Category badge */}
                <CategoryBadge category={tx.category} size="sm" />

                {/* Content */}
                <div 
                  className="min-w-0 flex-1 cursor-pointer group"
                  onClick={() => !isDeselected && setEditingTxIndex(tx.index)}
                >
                  <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors flex items-center gap-2">
                    {tx.title || tx.description}
                    {!isDeselected && <Pencil className="w-3 h-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </p>
                  <p className="text-micro text-on-surface-variant truncate">
                    {tx.description}
                  </p>
                </div>

                {/* Amount & type */}
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    'text-sm font-bold',
                    tx.type === 'income' ? 'text-secondary' : 'text-on-surface',
                  )}>
                    {tx.type === 'income' ? '+' : '-'}{APP_CONFIG.currency}{Math.abs(tx.amount || 0).toFixed(2)}
                  </p>
                  <span className={cn('text-micro font-bold px-1.5 py-0.5 rounded-full', CONFIDENCE_STYLES[tx.confidence])}>
                    {tx.confidence}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Edit Transaction Dialog ──────────────────────────────────── */}
      <AnimatePresence>
        {editingTx && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Edit transaction"
          >
            <button type="button" className="absolute inset-0" onClick={() => setEditingTxIndex(null)} aria-label="Close dialog" />
            <motion.div
              initial={{ y: 24, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 16, scale: 0.98 }}
              className="relative z-10 w-full max-w-md rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-micro font-bold text-primary">Quick edit</p>
                  <h3 className="font-headline text-lg font-extrabold text-on-surface">Import Transaction</h3>
                </div>
                <button type="button" onClick={() => setEditingTxIndex(null)} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex p-1 bg-surface-container-high rounded-full mb-2 w-full max-w-[200px] mx-auto scale-90">
                  <button 
                    onClick={() => updateType(editingTx.index, 'expense')}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-full font-headline font-bold text-[10px] transition-all",
                      editingTx.type === 'expense' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-variant/50"
                    )}
                  >
                    Expense
                  </button>
                  <button 
                    onClick={() => updateType(editingTx.index, 'income')}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-full font-headline font-bold text-[10px] transition-all",
                      editingTx.type === 'income' ? "bg-secondary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-variant/50"
                    )}
                  >
                    Income
                  </button>
                </div>

                <section className="text-center py-2">
                  <label className="block text-on-surface-variant text-micro mb-1 font-bold">Entry Amount</label>
                  <div 
                    onClick={() => setIsKeypadOpen(true)}
                    className="relative inline-flex items-baseline justify-center cursor-pointer group"
                  >
                    <span className="text-xl font-headline font-extrabold text-on-surface-variant mr-1.5 group-hover:scale-110 transition-transform">{APP_CONFIG.currency}</span>
                    <span className="text-4xl font-headline font-extrabold text-primary p-0 group-hover:scale-105 transition-transform">
                      {String(editingTx.amount)}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-primary/30 ml-1.5 group-hover:text-primary transition-colors" />
                  </div>
                  
                  <NumericKeypadModal 
                    isOpen={isKeypadOpen} 
                    onClose={() => setIsKeypadOpen(false)} 
                    onConfirm={(val) => updateAmount(editingTx.index, parseFloat(val) || 0)}
                    initialValue={String(editingTx.amount)}
                  />
                </section>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto px-1 pb-2">
                  <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1.5">
                    <label className="text-micro font-bold text-on-surface-variant">Transaction Title</label>
                    <input
                      className="w-full bg-transparent border-none p-0 text-sm font-bold text-on-surface focus:ring-0"
                      value={editingTx.title || ''}
                      placeholder="Title"
                      onChange={(e) => updateTitle(editingTx.index, e.target.value)}
                    />
                  </div>

                  <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1.5">
                    <label className="text-micro font-bold text-on-surface-variant">Date</label>
                    <input 
                      type="date" 
                      className="bg-transparent border-none p-0 text-xs font-headline font-bold text-primary focus:ring-0 w-full"
                      value={editingTx.date || ''}
                      onChange={(e) => updateDate(editingTx.index, e.target.value)}
                    />
                  </div>

                  <div className="bg-surface-container-low rounded-2xl p-4">
                    <CategoryPicker 
                      categories={categories} 
                      value={editingTx.category} 
                      onChange={(c) => updateCategory(editingTx.index, c)} 
                      onAddCategory={onAddCategory} 
                    />
                  </div>

                  <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1.5">
                    <label className="text-micro font-bold text-on-surface-variant">Description / Notes</label>
                    <textarea 
                      className="w-full bg-transparent border-none p-0 text-xs font-bold text-on-surface focus:ring-0 min-h-[60px] resize-none placeholder:text-on-surface-variant/50" 
                      placeholder="Add notes..."
                      value={editingTx.description || ''}
                      onChange={(e) => updateDescription(editingTx.index, e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => { toggleSelection(editingTx.index); setEditingTxIndex(null); }} 
                    className="flex-1 py-3.5 bg-surface-container-high text-on-surface font-headline font-bold text-sm rounded-2xl active:scale-[0.98] transition-all"
                  >
                    {editingTx.isDeselected ? 'Include' : 'Exclude'}
                  </button>
                  <button 
                    onClick={() => setEditingTxIndex(null)} 
                    className="flex-[2] py-3.5 bg-primary text-on-primary font-headline font-extrabold text-sm rounded-2xl shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
