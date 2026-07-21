import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, RefreshCw, X, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { CategoryPicker } from '../components/CategoryPicker';
import { cn } from '../lib/utils';
import { RecurringExpense, Transaction } from '../types';
import { APP_CONFIG } from '../constants';
import { Button, EmptyState, Input } from '../components/ui';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TransactionQuickEditDialog } from '../components/TransactionQuickEditDialog';
import { useToast } from '../components/Toast';
import { haptics } from '../utils/haptics';
import { pageTransition } from '../utils/motion';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { CalendarMonthSummary } from '../components/calendar/CalendarMonthSummary';
import { ExtraTransactionBadge } from '../components/ExtraTransactionBadge';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  formatUtcDateLabel,
  getRecurringFrequencyLabel,
  getRecurringDraftStartDate,
  getRecurringReminderSettings,
  getRecurringOccurrenceKey,
  getRecurringOccurrencesInMonth,
  getRecurringOverride,
  getUtcDateInputValue,
  upsertRecurringOverride,
} from '../domain/recurring';
import { PlanningTabs } from '../components/planning/PlanningTabs';
import { RecurringFormFields } from '../components/planning/RecurringFormFields';
import { saveRecurringItem } from '../domain/recurringForm';
import { useRecurringForm } from '../hooks/useRecurringForm';

const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  return { startOffset, totalDays };
};

export const CalendarPage = () => {
  const { transactions, setTransactions, recurring, setRecurring, categories, addCategory } = useApp();
  const { toast } = useToast();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);
  const [recurringActionTarget, setRecurringActionTarget] = useState<RecurringExpense | null>(null);
  const [occurrenceTarget, setOccurrenceTarget] = useState<RecurringExpense | null>(null);
  const [quickEditTransaction, setQuickEditTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
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
  const recurringForm = useRecurringForm({
    defaultStartDate: selectedDate || fallbackDraftStartDate,
    defaultCategory: categories[0] || 'Housing',
  });

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

  useFocusTrap(recurringFormRef, recurringForm.isOpen, recurringForm.reset);
  useFocusTrap(recurringChoiceRef, recurringActionTarget !== null, () => setRecurringActionTarget(null));
  useFocusTrap(occurrenceFormRef, occurrenceTarget !== null, () => setOccurrenceTarget(null));

  const handleSaveRecurring = () => {
    const result = recurringForm.build(recurring);
    if (result.error) {
      const messages = { name: 'Enter a name', amount: 'Enter a valid amount', startDate: 'Enter a start date', dateRange: 'End date must be after the start date' };
      toast(messages[result.error], 'warning');
      return;
    }
    setRecurring(saveRecurringItem(recurring, result.item, recurringForm.editingId));
    toast(recurringForm.editingId ? 'Recurring updated' : 'Recurring added', 'success');
    recurringForm.reset();
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
    const remaining = recurring.filter((item) => item.id !== id);
    setRecurring(remaining);
    setDeleteId(null);
    haptics.warning();
    toast('Recurring removed', 'info', 5000, deleted ? {
      label: 'Undo',
      onClick: () => {
        setRecurring([...remaining, deleted]);
        haptics.success();
      },
    } : undefined);
  };

  const saveQuickEdit = (nextTransaction: Transaction) => {
    const existingTransaction = transactions.find((transaction) => transaction.id === nextTransaction.id);
    setTransactions(transactions.map((transaction) => (
      transaction.id === nextTransaction.id ? nextTransaction : transaction
    )));

    if (existingTransaction?.sourceRecurringId && existingTransaction.sourceMonthKey) {
      setRecurring(recurring.map((bill) => (
        bill.id === existingTransaction.sourceRecurringId
          ? upsertRecurringOverride(bill, {
            monthKey: existingTransaction.sourceMonthKey,
            occurrenceKey: existingTransaction.sourceMonthKey,
            amount: nextTransaction.amount,
            type: nextTransaction.type,
            category: nextTransaction.category,
            title: nextTransaction.title,
            description: nextTransaction.description,
            paymentMethod: nextTransaction.paymentMethod,
            date: nextTransaction.date,
          })
          : bill
      )));
    }

    setQuickEditTransaction(null);
    haptics.success();
    toast('Transaction updated', 'success');
  };

  const handleDeleteTransaction = (id: string) => {
    const deleted = transactions.find(t => t.id === id);
    if (!deleted) return;
    
    setTransactions(transactions.filter(t => t.id !== id));
    setTransactionToDelete(null);
    haptics.warning();
    toast('Transaction deleted', 'info', 5000, {
      label: 'Undo',
      onClick: () => {
        setTransactions([...transactions, deleted]);
        haptics.success();
      }
    });
  };

  return (
    <motion.div
      {...pageTransition}
      className="space-y-4 pb-24"
    >
      <PlanningTabs activeView="calendar" />

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
        onClick={recurringForm.openCreate}
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
                  <button
                    key={item.id}
                    onClick={() => openRecurringActions(item)}
                    className="flex w-full items-center gap-3 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5 text-left active:scale-[0.98] transition-all"
                  >
                    <CategoryBadge category={display.category} size="md" className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{display.name}</p>
                      <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">
                        {display.category} • {getRecurringFrequencyLabel(item.frequency)} • active until {formatUtcDateLabel(item.endDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <div className="flex flex-col items-end">
                        <span className={cn('text-sm font-extrabold', item.type === 'income' ? 'text-secondary' : 'text-on-surface')}>
                          {item.type === 'income' ? '+' : '-'}{formatCurrency(display.amount)}
                        </span>
                      </div>
                    </div>
                  </button>
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
                <button
                  key={tx.id}
                  onClick={() => setQuickEditTransaction(tx)}
                  className="flex w-full items-center gap-3 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5 text-left active:scale-[0.98] transition-all"
                >
                  <CategoryBadge category={tx.category} size="md" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-bold text-on-surface">{tx.title || tx.category}</p>
                      <ExtraTransactionBadge transaction={tx} className="shrink-0" />
                    </div>
                    <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">{tx.category}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="flex flex-col items-end">
                      <p className={cn('text-sm font-extrabold', tx.type === 'income' ? 'text-secondary' : 'text-on-surface')}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {recurringForm.isOpen && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button type="button" aria-label="Close recurring form" className="absolute inset-0" onClick={recurringForm.reset} />
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
              <h3 id="calendar-recurring-form-title" className="font-headline font-bold text-primary px-6 pt-5">{recurringForm.editingId ? 'Edit Recurring' : 'New Recurring'}</h3>
              <button onClick={recurringForm.reset} aria-label="Close recurring form" className="mr-5 mt-4"><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>

            <div className="max-h-[calc(88vh-80px)] overflow-y-auto overscroll-contain px-6 py-5">
              <RecurringFormFields
                name={recurringForm.draft.name}
                amount={recurringForm.draft.amount}
                startDate={recurringForm.draft.startDate}
                endDate={recurringForm.draft.endDate}
                category={recurringForm.draft.category}
                type={recurringForm.draft.type}
                frequency={recurringForm.draft.frequency}
                reminderEnabled={recurringForm.draft.reminderEnabled}
                reminderLeadDays={recurringForm.draft.reminderLeadDays}
                categories={categories}
                onNameChange={(value) => recurringForm.setField('name', value)}
                onAmountClick={() => setIsAmountKeypadOpen(true)}
                onStartDateChange={(value) => recurringForm.setField('startDate', value)}
                onEndDateChange={(value) => recurringForm.setField('endDate', value)}
                onCategoryChange={(value) => recurringForm.setField('category', value)}
                onTypeChange={(value) => recurringForm.setField('type', value)}
                onFrequencyChange={(value) => recurringForm.setField('frequency', value)}
                onReminderEnabledChange={(value) => recurringForm.setField('reminderEnabled', value)}
                onReminderLeadDaysChange={(value) => recurringForm.setField('reminderLeadDays', value)}
                onAddCategory={addCategory}
              />
            </div>

            <div className="absolute inset-x-0 bottom-0 border-t border-outline-variant/10 bg-surface-container-lowest/95 px-6 py-4 backdrop-blur flex gap-3">
              {recurringForm.editingId && (
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    setDeleteId(recurringForm.editingId);
                    recurringForm.reset();
                  }}
                >
                  Delete
                </Button>
              )}
              <Button className={recurringForm.editingId ? "flex-[2]" : "w-full"} onClick={handleSaveRecurring}>
                {recurringForm.editingId ? 'Update' : 'Add Recurring'}
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
                  recurringForm.openEdit(recurringActionTarget);
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
                  <label htmlFor="calendar-occurrence-name" className="block text-micro font-bold text-on-surface-variant mb-2">
                    Name
                  </label>
                  <input
                    id="calendar-occurrence-name"
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

              <div className="flex gap-3 pt-2">
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    setDeleteId(occurrenceTarget.id);
                    setOccurrenceTarget(null);
                  }}
                >
                  Delete Series
                </Button>
                <Button className="flex-[2]" onClick={handleSaveOccurrence}>
                  Save
                </Button>
              </div>
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
              <button
                key={item.id}
                onClick={() => recurringForm.openEdit(item)}
                className="flex w-full items-center gap-3 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5 text-left active:scale-[0.98] transition-all"
              >
                <CategoryBadge category={item.category} size="md" className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{item.name}</p>
                  <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">
                    Starts {getUtcDateInputValue(item.startDate)} • {getRecurringFrequencyLabel(item.frequency)} • {item.category}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <div className="flex flex-col items-end">
                    <span className={cn('text-sm font-extrabold', item.type === 'income' ? 'text-secondary' : 'text-on-surface')}>
                      {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              </button>
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
      <ConfirmDialog
        isOpen={transactionToDelete !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => transactionToDelete && handleDeleteTransaction(transactionToDelete)}
        onCancel={() => setTransactionToDelete(null)}
      />
      <TransactionQuickEditDialog
        transaction={quickEditTransaction}
        categories={categories}
        onAddCategory={addCategory}
        onClose={() => setQuickEditTransaction(null)}
        onSave={saveQuickEdit}
        onDelete={(id) => {
          setQuickEditTransaction(null);
          setTransactionToDelete(id);
        }}
      />
      <NumericKeypadModal
        isOpen={isAmountKeypadOpen}
        onClose={() => setIsAmountKeypadOpen(false)}
        onConfirm={(value) => recurringForm.setField('amount', value)}
        initialValue={recurringForm.draft.amount || '0.00'}
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
