import React from 'react';
import { Button } from '../ui';

interface BatchToolbarProps {
  selectionMode: boolean;
  selectedCount: number;
  visibleCount: number;
  categories: string[];
  batchCategory: string;
  onBatchCategoryChange: (category: string) => void;
  onChangeCategory: () => void;
  onSelectVisible: () => void;
  onClear: () => void;
  onExit: () => void;
}

export function BatchToolbar({
  selectionMode,
  selectedCount,
  visibleCount,
  categories,
  batchCategory,
  onBatchCategoryChange,
  onChangeCategory,
  onSelectVisible,
  onClear,
  onExit,
}: BatchToolbarProps) {
  if (!selectionMode) return null;

  return (
    <section className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">{selectedCount} selected</p>
          <p className="text-xs text-on-surface-variant">Change only the category of selected transactions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={batchCategory}
            onChange={(event) => onBatchCategoryChange(event.target.value)}
            className="min-h-10 rounded-xl border-none bg-surface-container-lowest px-3 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary"
            aria-label="Batch category"
          >
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={onSelectVisible} disabled={visibleCount === 0}>
            Select visible
          </Button>
          <Button size="sm" variant="secondary" onClick={onChangeCategory} disabled={selectedCount === 0 || !batchCategory}>
            Change category
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear} disabled={selectedCount === 0}>Clear</Button>
          <Button size="sm" variant="ghost" onClick={onExit}>Done selecting</Button>
        </div>
      </div>
    </section>
  );
}
