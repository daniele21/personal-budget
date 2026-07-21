import React from 'react';
import { Bell } from 'lucide-react';
import { APP_CONFIG } from '../../constants';
import type { RecurringFrequency, TransactionType } from '../../types';
import { cn } from '../../lib/utils';
import { CategoryPicker } from '../CategoryPicker';
import { Input, Switch } from '../ui';

const frequencyOptions: Array<{ value: RecurringFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const reminderOptions = [
  { value: 0, label: 'Due date' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
];

interface RecurringFormFieldsProps {
  name: string;
  amount: string;
  startDate: string;
  endDate: string;
  category: string;
  type: TransactionType;
  frequency: RecurringFrequency;
  reminderEnabled: boolean;
  reminderLeadDays: number;
  categories: string[];
  onNameChange: (value: string) => void;
  onAmountClick: () => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: TransactionType) => void;
  onFrequencyChange: (value: RecurringFrequency) => void;
  onReminderEnabledChange: (value: boolean) => void;
  onReminderLeadDaysChange: (value: number) => void;
  onAddCategory: (name: string) => void;
}

export function RecurringFormFields(props: RecurringFormFieldsProps) {
  return (
    <div className="space-y-3 pb-24">
      <div className="grid grid-cols-2 gap-2">
        {(['expense', 'income'] as const).map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={props.type === type}
            onClick={() => props.onTypeChange(type)}
            className={cn(
              'min-h-11 rounded-xl text-sm font-bold capitalize transition-colors',
              props.type === type
                ? type === 'expense' ? 'bg-tertiary text-on-primary' : 'bg-secondary text-on-primary'
                : 'bg-surface-container-low text-on-surface-variant',
            )}
          >
            {type === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(148px,0.8fr)] items-stretch gap-3">
        <div className="flex min-h-[72px] flex-col rounded-2xl bg-surface-container-high px-4 py-3">
          <label htmlFor="recurring-name" className="mb-2 block text-micro font-bold text-on-surface-variant">Name</label>
          <input id="recurring-name" value={props.name} onChange={(event) => props.onNameChange(event.target.value)} data-autofocus="true" placeholder="e.g. Mortgage, Salary" className="w-full flex-1 border-none bg-transparent p-0 font-headline text-lg font-bold leading-none text-on-surface placeholder:text-on-surface-variant/45 focus:ring-0" />
        </div>
        <button type="button" onClick={props.onAmountClick} className="flex min-h-[72px] flex-col rounded-2xl bg-surface-container-high px-4 py-3 text-left transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="mb-2 block text-micro font-bold text-on-surface-variant">Amount ({APP_CONFIG.currency})</span>
          <span className="mt-auto font-headline text-lg font-extrabold leading-none text-primary">{APP_CONFIG.currency}{props.amount || '0.00'}</span>
        </button>
      </div>

      <div className="space-y-2.5 rounded-2xl bg-surface-container-high p-4">
        <div>
          <p className="text-micro font-bold text-on-surface-variant">Schedule window</p>
          <p className="mt-1 text-xs leading-snug text-on-surface-variant">Start and end stay on the exact calendar day you choose.</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {frequencyOptions.map((option) => (
            <button key={option.value} type="button" aria-pressed={props.frequency === option.value} onClick={() => props.onFrequencyChange(option.value)} className={cn('min-h-11 whitespace-nowrap rounded-xl px-1.5 py-2 text-[0.6875rem] font-bold transition-colors', props.frequency === option.value ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-lowest')}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" type="date" value={props.startDate} onChange={(event) => props.onStartDateChange(event.target.value)} />
          <Input label="End Date" type="date" value={props.endDate} onChange={(event) => props.onEndDateChange(event.target.value)} />
        </div>
      </div>
      <p className="text-micro font-medium leading-snug text-on-surface-variant">Leave the end date empty to keep this recurring entry active for 1 year from the start date.</p>

      <div className="space-y-3 rounded-2xl bg-surface-container-high p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><Bell className="h-4 w-4" /></span>
            <div><p className="text-sm font-bold text-on-surface">Reminder</p><p className="text-micro text-on-surface-variant">Local notification before this recurring item is due.</p></div>
          </div>
          <Switch checked={props.reminderEnabled} onChange={() => props.onReminderEnabledChange(!props.reminderEnabled)} label="Recurring reminder" />
        </div>
        {props.reminderEnabled && (
          <div className="grid grid-cols-2 gap-2">
            {reminderOptions.map((option) => (
              <button key={option.value} type="button" aria-pressed={props.reminderLeadDays === option.value} onClick={() => props.onReminderLeadDaysChange(option.value)} className={cn('rounded-xl px-2 py-2 text-xs font-bold transition-colors', props.reminderLeadDays === option.value ? 'bg-secondary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-lowest')}>{option.label}</button>
            ))}
          </div>
        )}
      </div>

      <CategoryPicker categories={props.categories} value={props.category} onChange={props.onCategoryChange} onAddCategory={props.onAddCategory} />
    </div>
  );
}
