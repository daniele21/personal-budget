import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, RefreshCw, X, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from '../components/CategoryIcon';
import { CategoryPicker } from '../components/CategoryPicker';
import { cn } from '../lib/utils';
import { RecurringExpense, TransactionType } from '../types';
import { APP_CONFIG } from '../constants';
import { Button, Input } from '../components/ui';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import {
  formatUtcDateLabel,
  getDefaultRecurringEndDate,
  getUtcDateInputValue,
  getUtcDayOfMonth,
  isRecurringActiveInMonth,
} from '../domain/recurring';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  return { startOffset, totalDays };
};

export const CalendarPage = () => {
  const navigate = useNavigate();
  const { transactions, recurring, setRecurring, categories, addCategory } = useApp();
  const { toast } = useToast();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndDate, setNewEndDate] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0] || 'Housing');
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);

  const { startOffset, totalDays } = useMemo(
    () => getMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const txByDate = useMemo(() => {
    const map: Record<string, typeof transactions> = {};
    for (const tx of transactions) {
      const dateKey = tx.date?.slice(0, 10);
      if (dateKey) (map[dateKey] ??= []).push(tx);
    }
    return map;
  }, [transactions]);

  const dailyTotals = useMemo(() => {
    const map: Record<string, { income: number; expenses: number }> = {};
    for (let day = 1; day <= totalDays; day++) {
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTx = txByDate[key] || [];
      map[key] = {
        income: dayTx.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0),
        expenses: dayTx.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0),
      };
    }
    return map;
  }, [txByDate, viewYear, viewMonth, totalDays]);

  const recurringByDay = useMemo(() => {
    const map: Record<number, RecurringExpense[]> = {};
    for (const item of recurring) {
      if (!isRecurringActiveInMonth(item, viewYear, viewMonth)) continue;
      (map[item.dayOfMonth] ??= []).push(item);
    }
    return map;
  }, [recurring, viewYear, viewMonth]);

  const selectedTx = selectedDate ? txByDate[selectedDate] || [] : [];
  const selectedDay = selectedDate ? parseInt(selectedDate.split('-')[2], 10) : null;
  const selectedRecurring = selectedDay ? recurringByDay[selectedDay] || [] : [];

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const goBack = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
    setSelectedDate(null);
  };

  const goForward = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
    setSelectedDate(null);
  };

  const monthTotals = useMemo(() => {
    const values = Object.values(dailyTotals) as Array<{ income: number; expenses: number }>;
    return {
      income: values.reduce((sum, value) => sum + value.income, 0),
      expenses: values.reduce((sum, value) => sum + value.expenses, 0),
    };
  }, [dailyTotals]);

  const monthlyRecurringTotal = useMemo(
    () => (Object.values(recurringByDay) as RecurringExpense[][])
      .flat()
      .reduce((sum, item) => sum + item.amount, 0),
    [recurringByDay],
  );

  const resetForm = () => {
    setShowRecurringForm(false);
    setEditingId(null);
    setNewName('');
    setNewAmount('');
    setNewStartDate(selectedDate || new Date().toISOString().split('T')[0]);
    setNewEndDate('');
    setNewCategory(categories[0] || 'Housing');
    setNewType('expense');
  };

  const handleSaveRecurring = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast('Enter a name', 'warning');
      return;
    }

    const parsed = parseFloat(newAmount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast('Enter a valid amount', 'warning');
      return;
    }

    if (!newStartDate) {
      toast('Enter a start date', 'warning');
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

    const bill: RecurringExpense = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: trimmed,
      amount: parsed,
      startDate,
      endDate,
      dayOfMonth: getUtcDayOfMonth(startDate),
      category: newCategory,
      type: newType,
      frequency: 'monthly',
      priority: newType === 'expense',
      overrides: existingOverrides,
    };

    if (editingId) {
      setRecurring(recurring.map((item) => (item.id === editingId ? bill : item)));
      toast('Recurring updated', 'success');
    } else {
      setRecurring([...recurring, bill]);
      toast('Recurring added', 'success');
    }

    resetForm();
  };

  const handleEdit = (item: RecurringExpense) => {
    setEditingId(item.id);
    setNewName(item.name);
    setNewAmount(item.amount.toString());
    setNewStartDate(getUtcDateInputValue(item.startDate));
    setNewEndDate(getUtcDateInputValue(item.endDate));
    setNewCategory(item.category);
    setNewType(item.type ?? 'expense');
    setShowRecurringForm(true);
  };

  const handleDelete = (id: string) => {
    setRecurring(recurring.filter((item) => item.id !== id));
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
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="p-2 hover:bg-surface-container-low rounded-full transition-colors" aria-label="Previous month">
          <ChevronLeft className="w-5 h-5 text-primary" />
        </button>
        <h2 className="font-headline font-bold text-lg text-primary">{monthLabel}</h2>
        <button onClick={goForward} className="p-2 hover:bg-surface-container-low rounded-full transition-colors" aria-label="Next month">
          <ChevronRight className="w-5 h-5 text-primary" />
        </button>
      </div>

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

      <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/5 shadow-sm">
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: startOffset }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}
          {Array.from({ length: totalDays }).map((_, index) => {
            const day = index + 1;
            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const totals = dailyTotals[key];
            const hasExpenses = totals && totals.expenses > 0;
            const hasIncome = totals && totals.income > 0;
            const hasRecurring = Boolean(recurringByDay[day]?.length);
            const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
            const isSelected = key === selectedDate;

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(isSelected ? null : key)}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all text-sm',
                  isSelected ? 'bg-primary text-on-primary shadow-md'
                    : isToday ? 'bg-primary/10 text-primary font-bold'
                      : 'hover:bg-surface-container-low text-on-surface',
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

      <button
        onClick={() => setShowRecurringForm(true)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-colors"
      >
        <RefreshCw className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-primary uppercase tracking-wider">+ Add Recurring</span>
      </button>

      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface-variant">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
          </div>

          {selectedRecurring.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Recurring on day {selectedDay}
              </p>
              {selectedRecurring.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-primary/5 rounded-2xl p-3 border border-primary/10">
                  <CategoryIcon category={item.category} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{item.name}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {item.category} • monthly • active until {formatUtcDateLabel(item.endDate)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatCurrency(item.amount)}</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => handleEdit(item)} className="p-1.5 text-primary hover:bg-primary/10 rounded-full" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-tertiary hover:bg-tertiary/10 rounded-full" aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTx.length === 0 && selectedRecurring.length === 0 ? (
            <p className="text-xs text-on-surface-variant/60 py-4 text-center">No transactions on this day</p>
          ) : selectedTx.length > 0 && (
            <div className="space-y-2">
              {selectedTx.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
                  <CategoryIcon category={tx.category} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{tx.title || tx.category}</p>
                    <p className="text-[10px] text-on-surface-variant">{tx.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-3 h-3 text-secondary" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-tertiary" />
                    )}
                    <span className={cn('text-sm font-bold', tx.type === 'income' ? 'text-secondary' : 'text-tertiary')}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/edit/${tx.id}`)}
                      className="p-1.5 text-primary hover:bg-primary/10 rounded-full transition-all"
                      aria-label={`Edit transaction ${tx.title || tx.category}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {showRecurringForm && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button type="button" aria-label="Close recurring form" className="absolute inset-0" onClick={resetForm} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md max-h-[88vh] overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-2xl border border-outline-variant/10 sm:rounded-3xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-primary px-6 pt-5">{editingId ? 'Edit Recurring' : 'New Recurring'}</h3>
              <button onClick={resetForm} aria-label="Close" className="mr-5 mt-4"><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>

            <div className="max-h-[calc(88vh-80px)] overflow-y-auto overscroll-contain px-6 py-5">
              <div className="space-y-3 pb-24">
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

                <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(148px,0.8fr)] gap-3 items-stretch">
                  <div className="rounded-2xl bg-surface-container-high px-4 py-3 min-h-[72px] flex flex-col">
                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-2">
                      Name
                    </label>
                    <input
                      className="flex-1 w-full bg-transparent border-none p-0 text-lg font-headline font-bold text-on-surface placeholder:text-on-surface-variant/45 focus:ring-0 leading-none"
                      placeholder="e.g. Mortgage, Salary"
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
                    <Input label="Start Date" type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
                    <Input label="End Date" type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-on-surface-variant leading-snug">
                  Leave the end date empty to keep this recurring entry active for 1 year from the start date.
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
              <Button fullWidth onClick={handleSaveRecurring}>
                {editingId ? 'Update' : 'Add Recurring'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {recurring.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-headline font-bold text-base text-primary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> All Recurring
            </h3>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{recurring.length} active</span>
          </div>
          <div className="space-y-2">
            {recurring.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
                <CategoryIcon category={item.category} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{item.name}</p>
                  <p className="text-[10px] text-on-surface-variant">
                    Day {item.dayOfMonth} • monthly • {item.category}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">{formatCurrency(item.amount)}</span>
                <div className="flex gap-0.5">
                  <button onClick={() => handleEdit(item)} className="p-1.5 text-primary hover:bg-primary/10 rounded-full" aria-label="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-tertiary hover:bg-tertiary/10 rounded-full" aria-label="Delete">
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
      <NumericKeypadModal
        isOpen={isAmountKeypadOpen}
        onClose={() => setIsAmountKeypadOpen(false)}
        onConfirm={setNewAmount}
        initialValue={newAmount || '0.00'}
      />
    </motion.div>
  );
};
