import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Plus, X, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from '../components/CategoryIcon';
import { CategoryPicker } from '../components/CategoryPicker';
import { cn } from '../lib/utils';
import { RecurringExpense } from '../types';
import { APP_CONFIG } from '../constants';
import { Button, Input } from '../components/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  return { startOffset, totalDays };
};

export const CalendarPage = () => {
  const { transactions, recurring, setRecurring, categories, setCategories } = useApp();
  const { toast } = useToast();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Recurring form state
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCategory, setNewCategory] = useState(categories[0] || 'Housing');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { startOffset, totalDays } = useMemo(
    () => getMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const txByDate = useMemo(() => {
    const map: Record<string, typeof transactions> = {};
    for (const tx of transactions) {
      const d = tx.date?.slice(0, 10);
      if (d) (map[d] ??= []).push(tx);
    }
    return map;
  }, [transactions]);

  const dailyTotals = useMemo(() => {
    const map: Record<string, { income: number; expenses: number }> = {};
    for (let day = 1; day <= totalDays; day++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTx = txByDate[key] || [];
      map[key] = {
        income: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    }
    return map;
  }, [txByDate, viewYear, viewMonth, totalDays]);

  // Recurring bills due on each day of the month
  const recurringByDay = useMemo(() => {
    const map: Record<number, RecurringExpense[]> = {};
    for (const r of recurring) {
      const day = new Date(r.dueDate).getDate();
      (map[day] ??= []).push(r);
    }
    return map;
  }, [recurring]);

  const selectedTx = selectedDate ? txByDate[selectedDate] || [] : [];
  const selectedDay = selectedDate ? parseInt(selectedDate.split('-')[2], 10) : null;
  const selectedRecurring = selectedDay ? recurringByDay[selectedDay] || [] : [];

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const goForward = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const monthTotals = useMemo(() => {
    const vals = Object.values(dailyTotals) as { income: number; expenses: number }[];
    return {
      income: vals.reduce((s, d) => s + d.income, 0),
      expenses: vals.reduce((s, d) => s + d.expenses, 0),
    };
  }, [dailyTotals]);

  const monthlyRecurringTotal = useMemo(
    () => recurring.reduce((s, r) => s + r.amount, 0),
    [recurring],
  );

  // Recurring form handlers
  const resetForm = () => {
    setShowRecurringForm(false);
    setEditingId(null);
    setNewName('');
    setNewAmount('');
    setNewDueDate(selectedDate || new Date().toISOString().split('T')[0]);
    setNewCategory(categories[0] || 'Housing');
    setNewFrequency('monthly');
    setNewType('expense');
  };

  const handleSaveRecurring = () => {
    const trimmed = newName.trim();
    if (!trimmed) { toast('Enter a name', 'warning'); return; }
    const parsed = parseFloat(newAmount);
    if (isNaN(parsed) || parsed <= 0) { toast('Enter a valid amount', 'warning'); return; }

    const dueDate = new Date(newDueDate + 'T00:00:00').toISOString();

    const bill: RecurringExpense = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: trimmed,
      amount: parsed,
      dueDate,
      category: newCategory,
      frequency: newFrequency,
      priority: newType === 'expense',
    };

    if (editingId) {
      setRecurring(recurring.map(r => r.id === editingId ? bill : r));
      toast('Recurring updated', 'success');
    } else {
      setRecurring([...recurring, bill]);
      toast('Recurring added', 'success');
    }
    resetForm();
  };

  const handleEdit = (r: RecurringExpense) => {
    setEditingId(r.id);
    setNewName(r.name);
    setNewAmount(r.amount.toString());
    setNewDueDate(new Date(r.dueDate).toISOString().split('T')[0]);
    setNewCategory(r.category);
    setNewFrequency(r.frequency || 'monthly');
    setNewType(r.priority !== false ? 'expense' : 'income');
    setShowRecurringForm(true);
  };

  const handleDelete = (id: string) => {
    setRecurring(recurring.filter(r => r.id !== id));
    setDeleteId(null);
    toast('Recurring removed', 'info');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 pb-24"
    >
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="p-2 hover:bg-surface-container-low rounded-full transition-colors" aria-label="Previous month">
          <ChevronLeft className="w-5 h-5 text-primary" />
        </button>
        <h2 className="font-headline font-bold text-lg text-primary">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button onClick={goForward} className="p-2 hover:bg-surface-container-low rounded-full transition-colors" aria-label="Next month">
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Income</p>
          <p className="text-base font-bold text-secondary">{formatCurrency(monthTotals.income)}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Expenses</p>
          <p className="text-base font-bold text-tertiary">{formatCurrency(monthTotals.expenses)}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Recurring</p>
          <p className="text-base font-bold text-primary">{formatCurrency(monthlyRecurringTotal)}</p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/5 shadow-sm">
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1;
            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const totals = dailyTotals[key];
            const hasExpenses = totals && totals.expenses > 0;
            const hasIncome = totals && totals.income > 0;
            const hasRecurring = !!recurringByDay[day]?.length;
            const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
            const isSelected = key === selectedDate;

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(isSelected ? null : key)}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all text-sm',
                  isSelected ? 'bg-primary text-on-primary shadow-md' :
                  isToday ? 'bg-primary/10 text-primary font-bold' :
                  'hover:bg-surface-container-low text-on-surface',
                )}
              >
                <span className="font-bold text-xs">{day}</span>
                {(hasExpenses || hasIncome || hasRecurring) && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasIncome && <span className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-on-primary/70' : 'bg-secondary')} />}
                    {hasExpenses && <span className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-on-primary/70' : 'bg-tertiary')} />}
                    {hasRecurring && <span className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-on-primary/70' : 'bg-primary')} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add recurring button */}
      <button
        onClick={() => setShowRecurringForm(true)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-colors"
      >
        <RefreshCw className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-wider">+ Add Recurring</span>
      </button>

      {/* Selected day detail */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface-variant">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
          </div>

          {/* Recurring bills on this day */}
          {selectedRecurring.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Recurring on day {selectedDay}
              </p>
              {selectedRecurring.map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-primary/5 rounded-2xl p-3 border border-primary/10">
                  <CategoryIcon category={r.category} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{r.name}</p>
                    <p className="text-[10px] text-on-surface-variant">{r.category} • {r.frequency}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatCurrency(r.amount)}</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => handleEdit(r)} className="p-1.5 text-primary hover:bg-primary/10 rounded-full" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-tertiary hover:bg-tertiary/10 rounded-full" aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transactions */}
          {selectedTx.length === 0 && selectedRecurring.length === 0 ? (
            <p className="text-xs text-on-surface-variant/60 py-4 text-center">No transactions on this day</p>
          ) : selectedTx.length > 0 && (
            <div className="space-y-2">
              {selectedTx.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
                  <CategoryIcon category={tx.category} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{tx.title || tx.category}</p>
                    <p className="text-[10px] text-on-surface-variant">{tx.category}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-3 h-3 text-secondary" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-tertiary" />
                    )}
                    <span className={cn('text-sm font-bold', tx.type === 'income' ? 'text-secondary' : 'text-tertiary')}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Recurring form dialog */}
      {showRecurringForm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={resetForm} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-surface-container-lowest p-5 rounded-3xl shadow-2xl border border-outline-variant/10 space-y-4"
          >
          <div className="flex justify-between items-center">
            <h3 className="font-headline font-bold text-primary">{editingId ? 'Edit Recurring' : 'New Recurring'}</h3>
            <button onClick={resetForm} aria-label="Close"><X className="w-5 h-5 text-on-surface-variant" /></button>
          </div>

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setNewType('expense')}
              className={cn(
                'py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all',
                newType === 'expense' ? 'bg-tertiary text-on-primary' : 'bg-surface-container-low text-on-surface-variant',
              )}
            >
              Expense
            </button>
            <button
              onClick={() => setNewType('income')}
              className={cn(
                'py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all',
                newType === 'income' ? 'bg-secondary text-on-primary' : 'bg-surface-container-low text-on-surface-variant',
              )}
            >
              Income
            </button>
          </div>

          <Input label="Name" placeholder="e.g. Netflix, Salary" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Amount (${APP_CONFIG.currency})`} type="number" placeholder="0.00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
            <Input label="Start Date" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
          </div>

          {/* Frequency picker */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">Frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {([['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setNewFrequency(val)}
                  className={cn(
                    'py-2.5 rounded-xl text-xs font-bold transition-all',
                    newFrequency === val ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-low',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category picker */}
          <CategoryPicker
            categories={categories}
            value={newCategory}
            onChange={setNewCategory}
            onAddCategory={(name) => setCategories([...categories, name])}
          />

          <Button fullWidth onClick={handleSaveRecurring}>
            {editingId ? 'Update' : 'Add Recurring'}
          </Button>
        </motion.div>
        </>
      )}

      {/* All recurring summary */}
      {recurring.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline font-bold text-base text-primary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> All Recurring
            </h3>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{recurring.length} active</span>
          </div>
          <div className="space-y-2">
            {recurring.map(r => (
              <div key={r.id} className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
                <CategoryIcon category={r.category} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{r.name}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    Day {new Date(r.dueDate).getDate()} • {r.frequency} • {r.category}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">{formatCurrency(r.amount)}</span>
                <div className="flex gap-0.5">
                  <button onClick={() => handleEdit(r)} className="p-1.5 text-primary hover:bg-primary/10 rounded-full" aria-label="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-tertiary hover:bg-tertiary/10 rounded-full" aria-label="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Remove Recurring"
        message="Are you sure you want to remove this recurring entry?"
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
};
