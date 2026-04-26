import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui';

interface BatchToolbarProps {
  selectedCount: number;
  categories: string[];
  batchCategory: string;
  onBatchCategoryChange: (category: string) => void;
  onChangeCategory: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BatchToolbar({
  selectedCount,
  categories,
  batchCategory,
  onBatchCategoryChange,
  onChangeCategory,
  onExport,
  onDelete,
  onClear,
}: BatchToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <section className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">{selectedCount} selected</p>
          <p className="text-xs text-on-surface-variant">Batch edit, export, or delete selected transactions.</p>
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
          <Button size="sm" variant="secondary" onClick={onChangeCategory}>Change category</Button>
          <Button size="sm" variant="secondary" onClick={onExport}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={onClear}>Clear</Button>
        </div>
      </div>
    </section>
  );
}
