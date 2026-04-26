import React from 'react';
import { PeriodComparison } from '../../domain/finance';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../lib/utils';

export function ComparisonSummary({ comparison }: { comparison: PeriodComparison }) {
  const rows = [
    { label: 'Income', a: comparison.totalsA.income, b: comparison.totalsB.income, color: 'text-secondary' },
    { label: 'Expenses', a: comparison.totalsA.expenses, b: comparison.totalsB.expenses, color: 'text-tertiary' },
    { label: 'Net', a: comparison.totalsA.net, b: comparison.totalsB.net, color: comparison.totalsA.net >= 0 ? 'text-secondary' : 'text-tertiary' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {rows.map((row) => {
        const delta = row.a - row.b;
        const percent = row.b !== 0 ? (delta / row.b) * 100 : null;
        return (
          <div key={row.label} className="rounded-3xl bg-surface-container-lowest border border-outline-variant/5 p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">{row.label}</p>
            <p className={cn('text-xl font-extrabold', row.color)}>{formatCurrency(row.a)}</p>
            <p className="text-xs text-on-surface-variant">vs {formatCurrency(row.b)}</p>
            <p className={cn('mt-2 text-[10px] font-bold uppercase tracking-widest', delta >= 0 ? 'text-secondary' : 'text-tertiary')}>
              {delta >= 0 ? '+' : ''}{formatCurrency(delta)}{percent !== null ? ` · ${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%` : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}
