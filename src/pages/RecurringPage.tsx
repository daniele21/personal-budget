import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Plus, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { APP_CONFIG } from '../constants';
import { RecurringExpense, RecurringFrequency } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { CategoryPicker } from '../components/CategoryPicker';
import { Button, Card, EmptyState, Input, Switch } from '../components/ui';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { RecurringEntryCard } from '../components/RecurringEntryCard';
import { haptics } from '../utils/haptics';
import { pageTransition } from '../utils/motion';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  getDefaultRecurringEndDate,
  getRecurringFrequencyLabel,
  getRecurringReminderLabel,
  getRecurringReminderSettings,
  getRecurringDraftStartDate,
  getRecurringOccurrencesInMonth,
  getUtcDateInputValue,
  getUtcDayOfMonth,
  isRecurringActiveInMonth,
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
  const [newFrequency, setNewFrequency] = useState<RecurringFrequency>('monthly');
  const [newReminderEnabled, setNewReminderEnabled] = useState(false);
  const [newReminderLeadDays, setNewReminderLeadDays] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);
  const recurringDialogRef = useRef<HTMLDivElement>(null);

  const getCreateStartDate = () => getRecurringDraftStartDate(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    selectedDay,
  );

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewName('');
    setNewAmount('');
    setNewStartDate(getCreateStartDate());
    setNewEndDate('');
    setNewCategory(categories[0]);
    setNewFrequency('monthly');
    setNewReminderEnabled(false);
    setNewReminderLeadDays(1);
  };

  useFocusTrap(recurringDialogRef, isAdding, resetForm);

  const openCreateRecurring = () => {
    setEditingId(null);
    setNewName('');
    setNewAmount('');
    setNewStartDate(getCreateStartDate());
    setNewEndDate('');
    setNewCategory(categories[0]);
    setNewFrequency('monthly');
    setNewReminderEnabled(false);
    setNewReminderLeadDays(1);
    setIsAdding(true);
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
      frequency: newFrequency,
      priority: true,
      reminder: {
        enabled: newReminderEnabled,
        leadDays: newReminderLeadDays,
      },
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
    setNewFrequency(bill.frequency ?? 'monthly');
    const reminder = getRecurringReminderSettings(bill);
    setNewReminderEnabled(reminder.enabled);
    setNewReminderLeadDays(reminder.leadDays);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    const deleted = recurring.find((item) => item.id === id);
    setRecurring(recurring.filter((item) => item.id !== id));
    setDeleteId(null);
    haptics.warning();
    toast('Recurring bill removed', 'info', 5000, deleted ? {
      label: 'Undo',
      onClick: () => {
        setRecurring([...recurring, deleted]);
        haptics.success();
      },
    } : undefined);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  return (
    <motion.div
      {...pageTransition}
      className="space-y-4 pb-24"
    >
      <Card as="section">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-lg font-bold text-primary">
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={openCreateRecurring}
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
            <span key={`${dayLabel}-${idx}`} className="text-xs font-bold text-on-surface-variant">{dayLabel}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const hasExpense = recurring.some((item) => (
              isRecurringActiveInMonth(item, year, month) &&
              getRecurringOccurrencesInMonth(item, year, month).some((date) => date.getUTCDate() === day)
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
      </Card>

      {isAdding && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button type="button" aria-label="Close recurring form" className="absolute inset-0" onClick={resetForm} />
          <motion.div
            ref={recurringDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurring-form-title"
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md max-h-[88vh] overflow-hidden rounded-t-3xl bg-surface-container-lowest shadow-2xl border border-outline-variant/10 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-5">
              <h3 id="recurring-form-title" className="font-headline font-bold text-primary">{editingId ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</h3>
              <button onClick={resetForm}><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>

            <div className="max-h-[calc(88vh-80px)] overflow-y-auto overscroll-contain px-6 py-5">
              <div className="space-y-3 pb-24">
                <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(148px,0.8fr)] gap-3 items-stretch">
                  <div className="rounded-2xl bg-surface-container-high px-4 py-3 min-h-[72px] flex flex-col">
                    <label className="block text-micro font-bold text-on-surface-variant mb-2">
                      Bill Name
                    </label>
                    <input
                      className="flex-1 w-full bg-transparent border-none p-0 text-lg font-headline font-bold text-on-surface placeholder:text-on-surface-variant/45 focus:ring-0 leading-none"
                      placeholder="e.g. Mortgage"
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
                <p className="text-micro font-medium text-on-surface-variant leading-snug">
                  If you leave the end date empty, the recurring bill stays active for 1 year from the start date.
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
            <span className="text-xs font-bold text-on-surface-variant">{recurring.length} Active</span>
          </div>
        </div>
        <div className="space-y-3">
          {recurring.length > 0 ? recurring.map((item) => (
            <RecurringEntryCard
              key={item.id}
              amount={item.amount}
              category={item.category}
              onDelete={() => setDeleteId(item.id)}
              onEdit={() => handleEdit(item)}
              reminderLabel={getRecurringReminderSettings(item).enabled ? getRecurringReminderLabel(getRecurringReminderSettings(item)) : undefined}
              subtitle={`Starts ${getUtcDateInputValue(item.startDate)} • ${getRecurringFrequencyLabel(item.frequency)} • ${item.category}`}
              title={item.name}
            />
          )) : (
            <div className="rounded-3xl bg-surface-container-low border border-dashed border-outline-variant/20">
              <EmptyState
                icon={<RefreshCw className="w-10 h-10" />}
                title="No recurring bills yet"
                description="Create rent, subscriptions, salary, or other repeating entries."
                action={<Button size="md" onClick={openCreateRecurring}>Add recurring bill</Button>}
              />
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
