import React from 'react';
import { PeriodComparison } from '../../domain/finance';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../lib/utils';
import { Card } from '../ui';

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
          <Card key={row.label} className="p-4">
            <p className="text-micro font-bold text-on-surface-variant mb-2">{row.label}</p>
            <p className={cn('text-xl font-extrabold', row.color)}>{formatCurrency(row.a)}</p>
            <p className="text-xs text-on-surface-variant">vs {formatCurrency(row.b)}</p>
            <p className={cn('mt-2 text-micro font-bold', delta >= 0 ? 'text-secondary' : 'text-tertiary')}>
              {delta >= 0 ? '+' : ''}{formatCurrency(delta)}{percent !== null ? ` · ${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%` : ''}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
