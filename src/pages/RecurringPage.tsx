import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { APP_CONFIG } from '../constants';
import { RecurringExpense } from '../types';
import { CategoryIcon } from '../components/CategoryIcon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { CategoryPicker } from '../components/CategoryPicker';
import { Button, Input } from '../components/ui';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import {
  formatUtcDateLabel,
  getDefaultRecurringEndDate,
  getUtcDateInputValue,
  getUtcDayOfMonth,
  isRecurringActiveInMonth,
} from '../domain/recurring';

export const RecurringPage = () => {
  const { toast } = useToast();
  const { recurring, setRecurring, categories, addCategory } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewName('');
    setNewAmount('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewEndDate('');
    setNewCategory(categories[0]);
  };

  const handleAddRecurring = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      toast('Please enter a bill name', 'warning');
      return;
    }

    const parsedAmount = parseFloat(newAmount);
    if (!newAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast('Please enter a valid amount greater than 0', 'warning');
      return;
    }

    if (!newStartDate) {
      toast('Please select a start date', 'warning');
      return;
    }

    const startDate = new Date(`${newStartDate}T00:00:00.000Z`).toISOString();
    const endDate = newEndDate
      ? new Date(`${newEndDate}T00:00:00.000Z`).toISOString()
      : getDefaultRecurringEndDate(startDate);

    if (new Date(endDate) < new Date(startDate)) {
      toast('End date must be after the start date', 'warning');
      return;
    }

    const existingOverrides = editingId
      ? recurring.find((item) => item.id === editingId)?.overrides ?? []
      : [];

    const newBill: RecurringExpense = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: trimmedName,
      amount: parsedAmount,
      startDate,
      endDate,
      dayOfMonth: getUtcDayOfMonth(startDate),
      category: newCategory,
      type: 'expense',
      frequency: 'monthly',
      priority: true,
      overrides: existingOverrides,
    };

    if (editingId) {
      setRecurring(recurring.map((item) => (item.id === editingId ? newBill : item)));
      toast('Recurring bill updated', 'success');
    } else {
      setRecurring([...recurring, newBill]);
      toast('Recurring bill added', 'success');
    }

    resetForm();
  };

  const handleEdit = (bill: RecurringExpense) => {
    setEditingId(bill.id);
    setNewName(bill.name);
    setNewAmount(bill.amount.toString());
    setNewStartDate(getUtcDateInputValue(bill.startDate));
    setNewEndDate(getUtcDateInputValue(bill.endDate));
    setNewCategory(bill.category);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setRecurring(recurring.filter((item) => item.id !== id));
    setDeleteId(null);
    toast('Recurring bill removed', 'info');
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 pb-24"
    >
      <section className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-lg font-bold text-primary">
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="p-2 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
              aria-label="Add recurring bill"
            >
              <Plus className="w-4 h-4 text-primary" />
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4 text-primary" />
              </button>
              <button
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, idx) => (
            <span key={`${dayLabel}-${idx}`} className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{dayLabel}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const hasExpense = recurring.some((item) => (
              item.dayOfMonth === day && isRecurringActiveInMonth(item, year, month)
            ));
            const isSelected = day === selectedDay;
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all min-h-[40px]',
                  isSelected ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface hover:bg-surface-container-low',
                  hasExpense && !isSelected && 'border border-secondary/30',
                  isToday && !isSelected && 'ring-1 ring-primary/30',
                )}
              >
                <span>{day}</span>
                {hasExpense && <div className={cn('w-1 h-1 rounded-full mt-0.5', isSelected ? 'bg-on-primary' : 'bg-secondary')} />}
              </button>
            );
          })}
        </div>
      </section>

      {isAdding && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button type="button" aria-label="Close recurring form" className="absolute inset-0" onClick={resetForm} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md max-h-[88vh] overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-2xl border border-outline-variant/10 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-5">
              <h3 className="font-headline font-bold text-primary">{editingId ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</h3>
              <button onClick={resetForm}><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>

            <div className="max-h-[calc(88vh-80px)] overflow-y-auto overscroll-contain px-6 py-5">
              <div className="space-y-3 pb-24">
                <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(148px,0.8fr)] gap-3 items-stretch">
                  <div className="rounded-2xl bg-surface-container-high px-4 py-3 min-h-[72px] flex flex-col">
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">
                      Bill Name
                    </label>
                    <input
                      className="flex-1 w-full bg-transparent border-none p-0 text-lg font-headline font-bold text-on-surface placeholder:text-on-surface-variant/45 focus:ring-0 leading-none"
                      placeholder="e.g. Mortgage"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAmountKeypadOpen(true)}
                    className="rounded-2xl bg-surface-container-high px-4 py-3 min-h-[72px] text-left transition-all hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary flex flex-col"
                  >
                    <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">
                      Amount ({APP_CONFIG.currency})
                    </span>
                    <span className="mt-auto text-lg font-headline font-extrabold text-primary leading-none">
                      {APP_CONFIG.currency}{newAmount || '0.00'}
                    </span>
                  </button>
                </div>
                <div className="rounded-2xl bg-surface-container-high p-4 space-y-2.5">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Schedule Window</p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-snug">Start and end stay on the exact calendar day you choose.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Start Date"
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                    />
                    <Input
                      label="End Date"
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-on-surface-variant leading-snug">
                  If you leave the end date empty, the recurring bill stays active for 1 year from the start date.
                </p>
                <CategoryPicker
                  categories={categories}
                  value={newCategory}
                  onChange={setNewCategory}
                  onAddCategory={addCategory}
                />
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 border-t border-outline-variant/10 bg-surface-container-lowest/95 px-6 py-4 backdrop-blur">
              <Button fullWidth onClick={handleAddRecurring}>
                {editingId ? 'Update Bill' : 'Add Bill'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      <NumericKeypadModal
        isOpen={isAmountKeypadOpen}
        onClose={() => setIsAmountKeypadOpen(false)}
        onConfirm={setNewAmount}
        initialValue={newAmount || '0.00'}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-headline font-extrabold text-lg">Recurring Plans</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{recurring.length} Active</span>
          </div>
        </div>
        <div className="space-y-3">
          {recurring.length > 0 ? recurring.map((item) => (
            <div key={item.id} className="bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-3 shadow-sm border border-outline-variant/5">
              <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
                <CategoryIcon category={item.category} className="text-primary" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-headline font-bold text-sm text-on-surface truncate">{item.name}</h4>
                  <span className="font-headline font-extrabold text-sm text-primary flex-shrink-0 ml-2">{formatCurrency(item.amount)}</span>
                </div>
                <div className="flex justify-between items-center mt-1 gap-3">
                  <span className="text-xs text-on-surface-variant font-medium">
                    Day {item.dayOfMonth} • {formatUtcDateLabel(item.startDate)} → {formatUtcDateLabel(item.endDate)}
                  </span>
                  <span className="text-xs uppercase tracking-tight bg-surface-container-highest px-2 py-0.5 rounded-full font-bold text-primary">
                    {item.overrides?.length ?? 0} monthly edits
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleEdit(item)} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all" aria-label="Edit bill">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(item.id)} className="p-2 text-tertiary hover:bg-tertiary/10 rounded-full transition-all" aria-label="Delete bill">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/20">
              <p className="text-sm text-on-surface-variant font-medium">No recurring bills yet</p>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Remove Recurring Bill"
        message="Are you sure you want to remove this recurring bill?"
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
};
