import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { RecurringExpense } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { Button, Card, EmptyState } from '../components/ui';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { RecurringEntryCard } from '../components/RecurringEntryCard';
import { haptics } from '../utils/haptics';
import { pageTransition } from '../utils/motion';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  getRecurringFrequencyLabel,
  getRecurringReminderLabel,
  getRecurringReminderSettings,
  getRecurringDraftStartDate,
  getRecurringOccurrencesInMonth,
  getUtcDateInputValue,
  isRecurringActiveInMonth,
} from '../domain/recurring';
import { PlanningTabs } from '../components/planning/PlanningTabs';
import { RecurringFormFields } from '../components/planning/RecurringFormFields';
import { saveRecurringItem } from '../domain/recurringForm';
import { useRecurringForm } from '../hooks/useRecurringForm';

export const RecurringPage = () => {
  const { toast } = useToast();
  const { recurring, setRecurring, categories, addCategory } = useApp();
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const [isAmountKeypadOpen, setIsAmountKeypadOpen] = useState(false);
  const recurringDialogRef = useRef<HTMLDivElement>(null);

  const getCreateStartDate = () => getRecurringDraftStartDate(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    selectedDay,
  );

  const recurringForm = useRecurringForm({
    defaultStartDate: getCreateStartDate(),
    defaultCategory: categories[0] || 'Housing',
  });

  useFocusTrap(recurringDialogRef, recurringForm.isOpen, recurringForm.reset);

  const handleAddRecurring = () => {
    const result = recurringForm.build(recurring);
    if (result.error) {
      const messages = {
        name: 'Please enter a bill name',
        amount: 'Please enter a valid amount greater than 0',
        startDate: 'Please select a start date',
        dateRange: 'End date must be after the start date',
      };
      toast(messages[result.error], 'warning');
      return;
    }
    setRecurring(saveRecurringItem(recurring, result.item, recurringForm.editingId));
    toast(recurringForm.editingId ? 'Recurring bill updated' : 'Recurring bill added', 'success');
    recurringForm.reset();
  };

  const handleDelete = (id: string) => {
    const deleted = recurring.find((item) => item.id === id);
    const remaining = recurring.filter((item) => item.id !== id);
    setRecurring(remaining);
    setDeleteId(null);
    haptics.warning();
    toast('Recurring bill removed', 'info', 5000, deleted ? {
      label: 'Undo',
      onClick: () => {
        setRecurring([...remaining, deleted]);
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
      <PlanningTabs activeView="recurring" />

      <Card as="section">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-lg font-bold text-primary">
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={recurringForm.openCreate}
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

      {recurringForm.isOpen && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button type="button" aria-label="Close recurring form" className="absolute inset-0" onClick={recurringForm.reset} />
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
              <h3 id="recurring-form-title" className="font-headline font-bold text-primary">{recurringForm.editingId ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</h3>
              <button onClick={recurringForm.reset}><X className="w-5 h-5 text-on-surface-variant" /></button>
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
              <Button className={recurringForm.editingId ? "flex-[2]" : "w-full"} onClick={handleAddRecurring}>
                {recurringForm.editingId ? 'Update' : 'Add Bill'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      <NumericKeypadModal
        isOpen={isAmountKeypadOpen}
        onClose={() => setIsAmountKeypadOpen(false)}
        onConfirm={(value) => recurringForm.setField('amount', value)}
        initialValue={recurringForm.draft.amount || '0.00'}
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
              type={item.type}
              onDelete={() => setDeleteId(item.id)}
              onEdit={() => recurringForm.openEdit(item)}
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
                action={<Button size="md" onClick={recurringForm.openCreate}>Add recurring bill</Button>}
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
