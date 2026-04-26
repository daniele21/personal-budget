import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface CalendarMonthSummaryProps {
  income: number;
  expenses: number;
  recurringTotal: number;
}

export function CalendarMonthSummary({ income, expenses, recurringTotal }: CalendarMonthSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-2xl border border-outline-variant/5 bg-surface-container-lowest p-3">
        <p className="text-micro text-on-surface-variant font-bold mb-1">Income</p>
        <p className="text-base font-bold text-secondary">{formatCurrency(income)}</p>
      </div>
      <div className="rounded-2xl border border-outline-variant/5 bg-surface-container-lowest p-3">
        <p className="text-micro text-on-surface-variant font-bold mb-1">Expenses</p>
        <p className="text-base font-bold text-tertiary">{formatCurrency(expenses)}</p>
      </div>
      <div className="rounded-2xl border border-outline-variant/5 bg-surface-container-lowest p-3">
        <p className="text-micro text-on-surface-variant font-bold mb-1">Recurring</p>
        <p className="text-base font-bold text-primary">{formatCurrency(recurringTotal)}</p>
      </div>
    </div>
  );
}
