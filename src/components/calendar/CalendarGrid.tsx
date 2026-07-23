import React from 'react';
import { cn } from '../../lib/utils';
import { RecurringExpense } from '../../types';
import { Card } from '../ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarGridProps {
  viewYear: number;
  viewMonth: number;
  startOffset: number;
  totalDays: number;
  selectedDate: string | null;
  dailyTotals: Record<string, { income: number; expenses: number }>;
  recurringByDay: Record<number, RecurringExpense[]>;
  onSelectDate: (date: string | null) => void;
}

export function CalendarGrid({
  viewYear,
  viewMonth,
  startOffset,
  totalDays,
  selectedDate,
  dailyTotals,
  recurringByDay,
  onSelectDate,
}: CalendarGridProps) {
  const today = new Date();

  return (
    <Card data-tour-id="planning-calendar" className="p-4">
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-micro font-bold text-on-surface-variant">{day}</div>
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
              onClick={() => onSelectDate(isSelected ? null : key)}
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
    </Card>
  );
}
