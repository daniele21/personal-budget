import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Transaction } from '../types';
import { Button, Input } from './ui';
import { CategoryPicker } from './CategoryPicker';

interface TransactionQuickEditDialogProps {
  transaction: Transaction | null;
  categories: string[];
  onAddCategory: (name: string) => void;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
}

export function TransactionQuickEditDialog({
  transaction,
  categories,
  onAddCategory,
  onClose,
  onSave,
}: TransactionQuickEditDialogProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!transaction) return;
    setTitle(transaction.title);
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setDate(transaction.date.slice(0, 10));
  }, [transaction]);

  const handleSave = () => {
    if (!transaction) return;
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !date) return;
    onSave({
      ...transaction,
      title: title.trim(),
      amount: parsedAmount,
      category,
      date: new Date(`${date}T00:00:00.000Z`).toISOString(),
      recurringEdited: transaction.sourceRecurringId ? true : transaction.recurringEdited,
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

            <div className="space-y-3">
              <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
                <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <CategoryPicker categories={categories} value={category} onChange={setCategory} onAddCategory={onAddCategory} />
              <Button fullWidth onClick={handleSave}>Save changes</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
