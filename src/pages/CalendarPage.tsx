import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, RefreshCw, X, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from '../components/CategoryIcon';
import { CategoryPicker } from '../components/CategoryPicker';
import { cn } from '../lib/utils';
import { RecurringExpense, RecurringFrequency, TransactionType } from '../types';
import { APP_CONFIG } from '../constants';
import { Button, EmptyState, Input, Switch } from '../components/ui';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/haptics';
import { pageTransition } from '../utils/motion';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { CalendarMonthSummary } from '../components/calendar/CalendarMonthSummary';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  formatUtcDateLabel,
  getDefaultRecurringEndDate,
  getRecurringFrequencyLabel,
  getRecurringDraftStartDate,
  getRecurringReminderSettings,
  getRecurringOccurrenceKey,
  getRecurringOccurrencesInMonth,
  getRecurringOverride,
  getUtcDateInputValue,
  getUtcDayOfMonth,
  upsertRecurringOverride,
} from '../domain/recurring';

const recurringFrequencyOptions: Array<{ value: RecurringFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const recurringReminderOptions = [
  { value: 0, label: 'Due date' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
];

const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  return { startOffset, totalDays };
};

export const CalendarPage = () => {
  const navigate = useNavigate();
  const { transactions, setTransactions, recurring, setRecurring, categories, addCategory } = useApp();
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
  const [newFrequency, setNewFrequency] = useState<RecurringFrequency>('monthly');
  const [newReminderEnabled, setNewReminderEnabled] = useState(false);
  const [newReminderLeadDays, setNewReminderLeadDays] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);
  const [recurringActionTarget, setRecurringActionTarget] = useState<RecurringExpense | null>(null);
  const [occurrenceTarget, setOccurrenceTarget] = useState<RecurringExpense | null>(null);
  const [occurrenceName, setOccurrenceName] = useState('');
  const [occurrenceAmount, setOccurrenceAmount] = useState('');
  const [occurrenceCategory, setOccurrenceCategory] = useState(categories[0] || 'Housing');
  const [isOccurrenceAmountKeypadOpen, setIsOccurrenceAmountKeypadOpen] = useState(false);
  const recurringFormRef = useRef<HTMLDivElement>(null);
  const recurringChoiceRef = useRef<HTMLDivElement>(null);
  const occurrenceFormRef = useRef<HTMLDivElement>(null);

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
      getRecurringOccurrencesInMonth(item, viewYear, viewMonth).forEach((occurrenceDate) => {
        const day = occurrenceDate.getUTCDate();
        (map[day] ??= []).push(item);
      });
    }
    return map;
  }, [recurring, viewYear, viewMonth]);

  const selectedTx = selectedDate ? txByDate[selectedDate] || [] : [];
  const selectedDay = selectedDate ? parseInt(selectedDate.split('-')[2], 10) : null;
  const selectedRecurring = selectedDay ? recurringByDay[selectedDay] || [] : [];
  const fallbackDraftStartDate = getRecurringDraftStartDate(viewYear, viewMonth, today.getDate());

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const getRecurringDisplayValues = (item: RecurringExpense, occurrenceKey: string) => {
    const override = getRecurringOverride(item, occurrenceKey);

    return {
      name: override?.title ?? item.name,
      amount: override?.amount ?? item.amount,
      category: override?.category ?? item.category,
    };
  };

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
    () => recurring.reduce((sum, item) => (
      sum + getRecurringOccurrencesInMonth(item, viewYear, viewMonth).reduce((occurrenceSum, occurrenceDate) => {
        const occurrenceKey = getRecurringOccurrenceKey(item, occurrenceDate);
        const override = getRecurringOverride(item, occurrenceKey);
        return occurrenceSum + (override?.amount ?? item.amount);
      }, 0)
    ), 0),
    [recurring, viewYear, viewMonth],
  );

  const resetForm = () => {
    setShowRecurringForm(false);
    setEditingId(null);
    setNewName('');
    setNewAmount('');
    setNewStartDate(selectedDate || fallbackDraftStartDate);
    setNewEndDate('');
    setNewCategory(categories[0] || 'Housing');
    setNewType('expense');
    setNewFrequency('monthly');
    setNewReminderEnabled(false);
    setNewReminderLeadDays(1);
  };

  useFocusTrap(recurringFormRef, showRecurringForm, resetForm);
  useFocusTrap(recurringChoiceRef, recurringActionTarget !== null, () => setRecurringActionTarget(null));
  useFocusTrap(occurrenceFormRef, occurrenceTarget !== null, () => setOccurrenceTarget(null));

  const openCreateRecurring = () => {
    setEditingId(null);
    setNewName('');
    setNewAmount('');
    setNewStartDate(selectedDate || fallbackDraftStartDate);
    setNewEndDate('');
    setNewCategory(categories[0] || 'Housing');
    setNewType('expense');
    setNewFrequency('monthly');
    setNewReminderEnabled(false);
    setNewReminderLeadDays(1);
    setShowRecurringForm(true);
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
      frequency: newFrequency,
      priority: newType === 'expense',
      reminder: {
        enabled: newReminderEnabled,
        leadDays: newReminderLeadDays,
      },
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
    setNewFrequency(item.frequency ?? 'monthly');
    const reminder = getRecurringReminderSettings(item);
    setNewReminderEnabled(reminder.enabled);
    setNewReminderLeadDays(reminder.leadDays);
    setShowRecurringForm(true);
  };

  const openRecurringActions = (item: RecurringExpense) => {
    setRecurringActionTarget(item);
  };

  const openOccurrenceEditor = (item: RecurringExpense) => {
    if (!selectedDate) return;

    const selectedOccurrenceDate = new Date(`${selectedDate}T00:00:00.000Z`);
    const occurrenceKey = getRecurringOccurrenceKey(item, selectedOccurrenceDate);
    const override = getRecurringOverride(item, occurrenceKey);
    const linkedTransaction = transactions.find((transaction) => (
      transaction.sourceRecurringId === item.id &&
      transaction.sourceMonthKey === occurrenceKey
    ));

    setOccurrenceTarget(item);
    setOccurrenceName(override?.title ?? linkedTransaction?.title ?? item.name);
    setOccurrenceAmount(String(override?.amount ?? linkedTransaction?.amount ?? item.amount));
    setOccurrenceCategory(override?.category ?? linkedTransaction?.category ?? item.category);
    setRecurringActionTarget(null);
  };

  const handleSaveOccurrence = () => {
    if (!occurrenceTarget || !selectedDate) return;

    const trimmedName = occurrenceName.trim();
    if (!trimmedName) {
      toast('Enter a name', 'warning');
      return;
    }

    const parsedAmount = parseFloat(occurrenceAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast('Enter a valid amount', 'warning');
      return;
    }

    const selectedOccurrenceDate = new Date(`${selectedDate}T00:00:00.000Z`);
    const occurrenceKey = getRecurringOccurrenceKey(occurrenceTarget, selectedOccurrenceDate);
    const occurrenceDate = new Date(`${selectedDate}T00:00:00.000Z`).toISOString();

    setRecurring(recurring.map((item) => (
      item.id === occurrenceTarget.id
        ? upsertRecurringOverride(item, {
          monthKey: occurrenceKey,
          occurrenceKey,
          title: trimmedName,
          amount: parsedAmount,
          category: occurrenceCategory,
          type: occurrenceTarget.type ?? 'expense',
          date: occurrenceDate,
        })
        : item
    )));

    setTransactions(transactions.map((transaction) => (
      transaction.sourceRecurringId === occurrenceTarget.id && transaction.sourceMonthKey === occurrenceKey
        ? {
          ...transaction,
          title: trimmedName,
          amount: parsedAmount,
          category: occurrenceCategory,
          date: occurrenceDate,
          recurringEdited: true,
        }
        : transaction
    )));

    setOccurrenceTarget(null);
    toast('Only this occurrence was updated', 'success');
  };

  const handleDelete = (id: string) => {
    const deleted = recurring.find((item) => item.id === id);
    setRecurring(recurring.filter((item) => item.id !== id));
    setDeleteId(null);
    haptics.warning();
    toast('Recurring removed', 'info', 5000, deleted ? {
      label: 'Undo',
      onClick: () => {
        setRecurring([...recurring, deleted]);
        haptics.success();
      },
    } : undefined);
  };

  return (
    <motion.div
      {...pageTransition}
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

      <CalendarMonthSummary
        income={monthTotals.income}
        expenses={monthTotals.expenses}
        recurringTotal={monthlyRecurringTotal}
      />

      <CalendarGrid
        viewYear={viewYear}
        viewMonth={viewMonth}
        startOffset={startOffset}
        totalDays={totalDays}
        selectedDate={selectedDate}
        dailyTotals={dailyTotals}
        recurringByDay={recurringByDay}
        onSelectDate={setSelectedDate}
      />

      <button
        onClick={openCreateRecurring}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-colors"
        aria-label="Add recurring entry"
      >
        <RefreshCw className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-primary">+ Add Recurring</span>
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
              <p className="text-micro text-primary font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Recurring on this day
              </p>
              {selectedRecurring.map((item) => {
                const occurrenceKey = selectedDate
                  ? getRecurringOccurrenceKey(item, new Date(`${selectedDate}T00:00:00.000Z`))
                  : '';
                const display = getRecurringDisplayValues(item, occurrenceKey);

                return (
                  <div key={item.id} className="flex items-center gap-3 bg-primary/5 rounded-2xl p-3 border border-primary/10">
                    <CategoryIcon category={display.category} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{display.name}</p>
                      <p className="text-micro text-on-surface-variant">
                        {display.category} • {getRecurringFrequencyLabel(item.frequency)} • active until {formatUtcDateLabel(item.endDate)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary">{formatCurrency(display.amount)}</span>
                    <div className="flex gap-0.5">
                      <button onClick={() => openRecurringActions(item)} className="p-1.5 text-primary hover:bg-primary/10 rounded-full" aria-label={`Edit recurring options for ${display.name}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-tertiary hover:bg-tertiary/10 rounded-full" aria-label={`Delete recurring ${display.name}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedTx.length === 0 && selectedRecurring.length === 0 ? (
            <div className="rounded-3xl bg-surface-container-low border border-dashed border-outline-variant/20">
              <EmptyState
                icon={<CalendarDays className="w-10 h-10" />}
                title="No activity on this day"
                description="Add a transaction or recurring entry for this date."
                action={{ label: 'Add transaction', to: '/add' }}
              />
            </div>
          ) : selectedTx.length > 0 && (
            <div className="space-y-2">
              {selectedTx.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
                  <CategoryIcon category={tx.category} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{tx.title || tx.category}</p>
                    <p className="text-micro text-on-surface-variant">{tx.category}</p>
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
            ref={recurringFormRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-recurring-form-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md max-h-[88vh] overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-2xl border border-outline-variant/10 sm:rounded-3xl"
          >
            <div className="flex justify-between items-center">
              <h3 id="calendar-recurring-form-title" className="font-headline font-bold text-primary px-6 pt-5">{editingId ? 'Edit Recurring' : 'New Recurring'}</h3>
              <button onClick={resetForm} aria-label="Close recurring form" className="mr-5 mt-4"><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>

            <div className="max-h-[calc(88vh-80px)] overflow-y-auto overscroll-contain px-6 py-5">
              <div className="space-y-3 pb-24">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewType('expense')}
                    className={cn(
                      'py-3 rounded-xl text-sm font-bold transition-all',
                      newType === 'expense' ? 'bg-tertiary text-on-primary' : 'bg-surface-container-low text-on-surface-variant',
                    )}
                  >
                    Expense
                  </button>
                  <button
                    onClick={() => setNewType('income')}
                    className={cn(
                      'py-3 rounded-xl text-sm font-bold transition-all',
                      newType === 'income' ? 'bg-secondary text-on-primary' : 'bg-surface-container-low text-on-surface-variant',
                    )}
                  >
                    Income
                  </button>
                </div>

                <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(148px,0.8fr)] gap-3 items-stretch">
                  <div className="rounded-2xl bg-surface-container-high px-4 py-3 min-h-[72px] flex flex-col">
                    <label className="block text-micro font-bold text-on-surface-variant mb-2">
                      Name
                    </label>
                    <input
                      className="flex-1 w-full bg-transparent border-none p-0 text-lg font-headline font-bold text-on-surface placeholder:text-on-surface-variant/45 focus:ring-0 leading-none"
                      placeholder="e.g. Mortgage, Salary"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      data-autofocus="true"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAmountKeypadOpen(true)}
                    className="rounded-2xl bg-surface-container-high px-4 py-3 min-h-[72px] text-left transition-all hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary flex flex-col"
                  >
                    <span className="block text-micro font-bold text-on-surface-variant mb-2">
                      Amount ({APP_CONFIG.currency})
                    </span>
                    <span className="mt-auto text-lg font-headline font-extrabold text-primary leading-none">
                      {APP_CONFIG.currency}{newAmount || '0.00'}
                    </span>
                  </button>
                </div>
                <div className="rounded-2xl bg-surface-container-high p-4 space-y-2.5">
                  <div>
                    <p className="text-micro font-bold text-on-surface-variant">Schedule Window</p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-snug">Start and end stay on the exact calendar day you choose.</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 [grid-template-columns:repeat(4,minmax(0,1fr))]">
                    {recurringFrequencyOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNewFrequency(option.value)}
                        className={cn(
                          'min-h-11 whitespace-nowrap rounded-xl px-1.5 py-2 text-[0.6875rem] font-bold transition-all',
                          newFrequency === option.value
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-lowest',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Start Date" type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
                    <Input label="End Date" type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
                  </div>
                </div>
                <p className="text-micro font-medium text-on-surface-variant leading-snug">
                  Leave the end date empty to keep this recurring entry active for 1 year from the start date.
                </p>

                <div className="rounded-2xl bg-surface-container-high p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">Reminder</p>
                        <p className="text-micro text-on-surface-variant">Local notification before this recurring item is due.</p>
                      </div>
                    </div>
                    <Switch
                      checked={newReminderEnabled}
                      onChange={() => setNewReminderEnabled((current) => !current)}
                      label="Recurring reminder"
                    />
                  </div>
                  {newReminderEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      {recurringReminderOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setNewReminderLeadDays(option.value)}
                          className={cn(
                            'rounded-xl px-2 py-2 text-xs font-bold transition-all',
                            newReminderLeadDays === option.value
                              ? 'bg-secondary text-on-primary'
                              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-lowest',
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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

      {recurringActionTarget && (
        <div className="fixed inset-0 z-[165] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button type="button" aria-label="Close recurring actions" className="absolute inset-0" onClick={() => setRecurringActionTarget(null)} />
          <motion.div
            ref={recurringChoiceRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-recurring-choice-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-sm rounded-t-3xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant/10 sm:rounded-3xl"
          >
            <div className="space-y-1 mb-5">
              <h3 id="calendar-recurring-choice-title" className="font-headline font-bold text-primary">Edit Recurring</h3>
              <p className="text-sm text-on-surface-variant">
                Choose whether to edit only the occurrence for {selectedDate ? formatUtcDateLabel(`${selectedDate}T00:00:00.000Z`) : 'this month'} or the whole recurring series.
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => openOccurrenceEditor(recurringActionTarget)}
                className="w-full rounded-2xl bg-primary text-on-primary px-4 py-3 text-left"
              >
                <p className="font-bold text-sm">Only This Occurrence</p>
                <p className="text-xs opacity-80 mt-1">Changes apply only to the selected month.</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleEdit(recurringActionTarget);
                  setRecurringActionTarget(null);
                }}
                className="w-full rounded-2xl bg-surface-container-high px-4 py-3 text-left"
              >
                <p className="font-bold text-sm text-on-surface">Whole Recurring Series</p>
                <p className="text-xs text-on-surface-variant mt-1">Changes apply to the base recurring plan.</p>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {occurrenceTarget && (
        <div className="fixed inset-0 z-[175] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button type="button" aria-label="Close occurrence editor" className="absolute inset-0" onClick={() => setOccurrenceTarget(null)} />
          <motion.div
            ref={occurrenceFormRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-occurrence-form-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md rounded-t-3xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant/10 sm:rounded-3xl"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 id="calendar-occurrence-form-title" className="font-headline font-bold text-primary">Edit Only This Occurrence</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {selectedDate ? formatUtcDateLabel(`${selectedDate}T00:00:00.000Z`) : 'Selected month'} only
                </p>
              </div>
              <button onClick={() => setOccurrenceTarget(null)} aria-label="Close occurrence editor">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(148px,0.8fr)] gap-3 items-stretch">
                <div className="rounded-2xl bg-surface-container-high px-4 py-3 min-h-[72px] flex flex-col">
                  <label className="block text-micro font-bold text-on-surface-variant mb-2">
                    Name
                  </label>
                  <input
                    className="flex-1 w-full bg-transparent border-none p-0 text-lg font-headline font-bold text-on-surface placeholder:text-on-surface-variant/45 focus:ring-0 leading-none"
                    placeholder="e.g. Mortgage"
                    value={occurrenceName}
                    onChange={(e) => setOccurrenceName(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsOccurrenceAmountKeypadOpen(true)}
                  className="rounded-2xl bg-surface-container-high px-4 py-3 min-h-[72px] text-left transition-all hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary flex flex-col"
                >
                  <span className="block text-micro font-bold text-on-surface-variant mb-2">
                    Amount ({APP_CONFIG.currency})
                  </span>
                  <span className="mt-auto text-lg font-headline font-extrabold text-primary leading-none">
                    {APP_CONFIG.currency}{occurrenceAmount || '0.00'}
                  </span>
                </button>
              </div>

              <CategoryPicker
                categories={categories}
                value={occurrenceCategory}
                onChange={setOccurrenceCategory}
                onAddCategory={addCategory}
              />

              <Button fullWidth onClick={handleSaveOccurrence}>
                Save Only This Occurrence
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
            <span className="text-micro font-bold text-on-surface-variant">{recurring.length} active</span>
          </div>
          <div className="space-y-2">
            {recurring.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
                <CategoryIcon category={item.category} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{item.name}</p>
                  <p className="text-micro text-on-surface-variant">
                    Starts {getUtcDateInputValue(item.startDate)} • {getRecurringFrequencyLabel(item.frequency)} • {item.category}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">{formatCurrency(item.amount)}</span>
                <div className="flex gap-0.5">
                  <button onClick={() => handleEdit(item)} className="p-1.5 text-primary hover:bg-primary/10 rounded-full" aria-label={`Edit recurring ${item.name}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-tertiary hover:bg-tertiary/10 rounded-full" aria-label={`Delete recurring ${item.name}`}>
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
      <NumericKeypadModal
        isOpen={isOccurrenceAmountKeypadOpen}
        onClose={() => setIsOccurrenceAmountKeypadOpen(false)}
        onConfirm={setOccurrenceAmount}
        initialValue={occurrenceAmount || '0.00'}
      />
    </motion.div>
  );
};
