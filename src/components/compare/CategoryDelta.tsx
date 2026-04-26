import React from 'react';
import { CategoryDelta as CategoryDeltaType } from '../../domain/finance';
import { CategoryIcon } from '../CategoryIcon';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../lib/utils';

export function CategoryDelta({ deltas }: { deltas: CategoryDeltaType[] }) {
  const max = Math.max(1, ...deltas.map((item) => Math.max(item.amountA, item.amountB)));

  if (deltas.length === 0) {
    return <p className="rounded-3xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">No expense categories in these periods.</p>;
  }

  return (
    <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/5 p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Category comparison</p>
      {deltas.map((item) => (
        <div key={item.category} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CategoryIcon category={item.category} className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-on-surface truncate">{item.category}</p>
            </div>
            <p className={cn('text-xs font-bold', item.delta <= 0 ? 'text-secondary' : 'text-tertiary')}>
              {item.delta >= 0 ? '+' : ''}{formatCurrency(item.delta)}
            </p>
          </div>
          <div className="grid grid-cols-[44px_1fr_72px] items-center gap-2 text-[10px] text-on-surface-variant">
            <span>A</span>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (item.amountA / max) * 100)}%` }} />
            </div>
            <span className="text-right">{formatCurrency(item.amountA)}</span>
            <span>B</span>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full rounded-full bg-accent-amber" style={{ width: `${Math.max(3, (item.amountB / max) * 100)}%` }} />
            </div>
            <span className="text-right">{formatCurrency(item.amountB)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
