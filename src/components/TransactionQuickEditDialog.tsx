import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Pencil } from 'lucide-react';
import { Transaction } from '../types';
import { Button } from './ui';
import { CategoryPicker } from './CategoryPicker';
import { NumericKeypadModal } from './NumericKeypadModal';
import { ExtraFlagToggle } from './ExtraFlagToggle';
import { APP_CONFIG } from '../constants';
import { cn } from '../lib/utils';

interface TransactionQuickEditDialogProps {
  transaction: Transaction | null;
  categories: string[];
  onAddCategory: (name: string) => void;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionQuickEditDialog({
  transaction,
  categories,
  onAddCategory,
  onClose,
  onSave,
  onDelete,
}: TransactionQuickEditDialogProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setDescription] = useState('');
  const [isExtra, setIsExtra] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);

  useEffect(() => {
    if (!transaction) return;
    setTitle(transaction.title);
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setDate(transaction.date.slice(0, 10));
    setType(transaction.type);
    setPaymentMethod(transaction.paymentMethod);
    setDescription(transaction.description || '');
    setIsExtra(!transaction.sourceRecurringId && transaction.reportingClass === 'extra');
  }, [transaction]);

  const handleSave = () => {
    if (!transaction) return;
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !date) return;
    onSave({
      ...transaction,
      title: title.trim(),
      amount: parsedAmount,
      type,
      category,
      date: new Date(`${date}T00:00:00.000Z`).toISOString(),
      paymentMethod,
      description,
      recurringEdited: transaction.sourceRecurringId ? true : transaction.recurringEdited,
      reportingClass: transaction.sourceRecurringId ? undefined : isExtra ? 'extra' : undefined,
      reportingNote: undefined,
    });
  };

  return (
    <AnimatePresence>
      {transaction && (
        <motion.div
          className="fixed inset-0 z-[175] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Quick edit transaction"
        >
          <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close quick edit" />
          <motion.div
            initial={{ y: 24, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 16, scale: 0.98 }}
            className="relative z-10 w-full max-w-md rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-micro font-bold text-primary">Quick edit</p>
                <h3 className="font-headline text-lg font-extrabold text-on-surface">Transaction details</h3>
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high" aria-label="Close quick edit">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex p-1 bg-surface-container-high rounded-full mb-2 w-full max-w-[200px] mx-auto scale-90">
                <button 
                  onClick={() => setType('expense')}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-full font-headline font-bold text-[10px] transition-all",
                    type === 'expense' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-variant/50"
                  )}
                >
                  Expense
                </button>
                <button 
                  onClick={() => setType('income')}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-full font-headline font-bold text-[10px] transition-all",
                    type === 'income' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-variant/50"
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
                    {amount}
                  </span>
                  <Pencil className="w-3.5 h-3.5 text-primary/30 ml-1.5 group-hover:text-primary transition-colors" />
                </div>
                
                <NumericKeypadModal 
                  isOpen={isKeypadOpen} 
                  onClose={() => setIsKeypadOpen(false)} 
                  onConfirm={(val) => setAmount(val)}
                  initialValue={amount}
                />
              </section>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto px-1 pb-2">
                <div
                  className={cn(
                    'rounded-2xl border p-4 transition-colors',
                    isExtra && !transaction.sourceRecurringId
                      ? 'border-accent-amber/35 bg-accent-amber/10'
                      : 'border-transparent bg-surface-container-low',
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="text-micro font-bold text-on-surface-variant">Transaction Title</label>
                    {!transaction.sourceRecurringId && (
                      <ExtraFlagToggle
                        checked={isExtra}
                        onChange={() => setIsExtra((current) => !current)}
                      />
                    )}
                  </div>
                  <input 
                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-on-surface focus:ring-0" 
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1.5">
                    <label className="text-micro font-bold text-on-surface-variant">Date</label>
                    <input 
                      type="date" 
                      className="bg-transparent border-none p-0 text-xs font-headline font-bold text-primary focus:ring-0 w-full"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1.5">
                    <label className="text-micro font-bold text-on-surface-variant">Payment</label>
                    <select 
                      className="bg-transparent border-none p-0 text-xs font-headline font-bold text-primary focus:ring-0 w-full appearance-none"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-2xl p-4">
                  <CategoryPicker categories={categories} value={category} onChange={setCategory} onAddCategory={onAddCategory} />
                </div>

                <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1.5">
                  <label className="text-micro font-bold text-on-surface-variant">Description / Notes</label>
                  <textarea 
                    className="w-full bg-transparent border-none p-0 text-xs font-bold text-on-surface focus:ring-0 min-h-[60px] resize-none placeholder:text-on-surface-variant/50" 
                    placeholder="Add notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="danger" className="flex-1" onClick={() => transaction && onDelete(transaction.id)}>Delete</Button>
                <Button className="flex-[2]" onClick={handleSave}>Save changes</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
