import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  CopyCheck,
  RotateCcw,
  Tags,
} from 'lucide-react';
import {
  applyImportCategory,
  excludeAllPossibleDuplicates,
  groupPreparedRowsByDescription,
  revalidateImportCategories,
  setImportRowsIncluded,
  setImportRowsSelected,
  undoLastImportReviewChange,
  type CategoryApplicationScope,
  type PreparedImportRow,
  type PreparedTransactionImport,
} from '../../domain/import';
import { APP_CONFIG } from '../../constants';
import { cn } from '../../lib/utils';
import { CategoryPicker } from '../CategoryPicker';
import { CategoryBadge } from '../ui/CategoryBadge';
import { Button } from '../ui';

const PAGE_SIZE = 100;
type ReviewFilter = 'all' | 'uncategorized' | 'warnings' | 'duplicates' | 'excluded';

interface ReviewStepProps {
  prepared: PreparedTransactionImport;
  categories: string[];
  onPreparedUpdated: (prepared: PreparedTransactionImport) => void;
  onAddCategory: (name: string) => void;
}

const FILTERS: Array<{ key: ReviewFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'uncategorized', label: 'Uncategorized' },
  { key: 'warnings', label: 'Warnings' },
  { key: 'duplicates', label: 'Possible duplicates' },
  { key: 'excluded', label: 'Excluded' },
];

function filteredRows(rows: readonly PreparedImportRow[], filter: ReviewFilter): PreparedImportRow[] {
  if (filter === 'uncategorized') return rows.filter((row) => row.category === 'Uncategorized');
  if (filter === 'warnings') return rows.filter((row) => row.issues.some((issue) => issue.severity === 'warning'));
  if (filter === 'duplicates') return rows.filter((row) => row.duplicateMatches.length > 0);
  if (filter === 'excluded') return rows.filter((row) => !row.included);
  return [...rows];
}

function amountLabel(row: PreparedImportRow): string {
  const sign = row.signedAmountMinor > 0 ? '+' : '-';
  return `${sign}${APP_CONFIG.currency}${(Math.abs(row.signedAmountMinor) / 100).toFixed(2)}`;
}

export function ReviewStep({
  prepared,
  categories,
  onPreparedUpdated,
  onAddCategory,
}: ReviewStepProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [page, setPage] = useState(1);
  const [categoryRowId, setCategoryRowId] = useState<string | null>(null);
  const [pendingCategory, setPendingCategory] = useState('');

  const visibleRows = useMemo(() => filteredRows(prepared.rows, filter), [filter, prepared.rows]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pageRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedRows = prepared.rows.filter((row) => row.selectedForBatch);
  const categoryRow = prepared.rows.find((row) => row.rowId === categoryRowId) ?? null;
  const sameDescriptionCount = categoryRow
    ? groupPreparedRowsByDescription(prepared.rows)
      .find((group) => group.matchKey === categoryRow.descriptionMatchKey)?.rowIds.length ?? 0
    : 0;

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    const revalidated = revalidateImportCategories(prepared, categories);
    if (revalidated !== prepared) onPreparedUpdated(revalidated);
  }, [categories, onPreparedUpdated, prepared]);

  const applyCategory = (scope: CategoryApplicationScope) => {
    if (!categoryRow || !pendingCategory) return;
    const activeCategories = categories.includes(pendingCategory)
      ? categories
      : [...categories, pendingCategory];
    onPreparedUpdated(applyImportCategory(prepared, {
      rowId: categoryRow.rowId,
      category: pendingCategory,
      scope,
      activeCategories,
    }));
    setCategoryRowId(null);
    setPendingCategory('');
  };

  const updateSelectedInclusion = (included: boolean) => {
    onPreparedUpdated(setImportRowsIncluded(
      prepared,
      new Set(selectedRows.map((row) => row.rowId)),
      included,
    ));
  };

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-headline text-base font-bold text-on-surface">Categorize and review</h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              Inclusion controls what will be imported. Selection is only for batch actions.
            </p>
          </div>
          {prepared.undoStack.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => onPreparedUpdated(undoLastImportReviewChange(prepared))}
              aria-label="Undo last review change"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Undo
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-container-low px-2 py-2">
            <p className="text-base font-extrabold text-on-surface">{prepared.summary.includedRows}</p>
            <p className="text-micro text-on-surface-variant">Included</p>
          </div>
          <div className="rounded-xl bg-surface-container-low px-2 py-2">
            <p className="text-base font-extrabold text-accent-amber">{prepared.summary.uncategorizedRows}</p>
            <p className="text-micro text-on-surface-variant">Uncategorized</p>
          </div>
          <div className="rounded-xl bg-surface-container-low px-2 py-2">
            <p className="text-base font-extrabold text-on-surface">{prepared.summary.possibleDuplicateRows}</p>
            <p className="text-micro text-on-surface-variant">Duplicates</p>
          </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Review filters">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setFilter(item.key);
              setPage(1);
            }}
            className={cn(
              'min-h-11 shrink-0 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              filter === item.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
            )}
            aria-pressed={filter === item.key}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-container-low p-3">
        <span className="mr-auto text-xs font-bold text-on-surface">
          {selectedRows.length} selected for batch edit
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => onPreparedUpdated(setImportRowsSelected(
            prepared,
            new Set(pageRows.map((row) => row.rowId)),
            true,
          ))}
        >
          Select page
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11"
          disabled={selectedRows.length === 0}
          onClick={() => onPreparedUpdated(setImportRowsSelected(
            prepared,
            new Set(selectedRows.map((row) => row.rowId)),
            false,
          ))}
        >
          Clear
        </Button>
        <Button variant="secondary" size="sm" className="min-h-11" disabled={selectedRows.length === 0} onClick={() => updateSelectedInclusion(false)}>
          Exclude selected
        </Button>
        <Button variant="secondary" size="sm" className="min-h-11" disabled={selectedRows.length === 0} onClick={() => updateSelectedInclusion(true)}>
          Include selected
        </Button>
      </div>

      {prepared.summary.possibleDuplicateRows > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11"
          onClick={() => onPreparedUpdated(excludeAllPossibleDuplicates(prepared))}
        >
          <CopyCheck className="h-4 w-4" aria-hidden="true" />
          Exclude all possible duplicates
        </Button>
      )}

      {visibleRows.length === 0 ? (
        <div role="status" className="rounded-2xl bg-surface-container-low px-4 py-8 text-center">
          <p className="text-sm font-bold text-on-surface">No rows in this filter</p>
          <p className="mt-1 text-xs text-on-surface-variant">Choose another filter to continue reviewing.</p>
        </div>
      ) : (
        <div className="space-y-2" aria-label="Transactions to review">
          {pageRows.map((row) => {
            const hasFutureDate = row.issues.some((issue) => issue.code === 'future_date');
            return (
              <article
                key={row.rowId}
                className={cn(
                  'rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-3 transition-opacity',
                  !row.included && 'opacity-60',
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={row.included}
                    aria-label={`${row.included ? 'Exclude' : 'Include'} row ${row.sourceRowNumber} from import`}
                    onClick={() => onPreparedUpdated(setImportRowsIncluded(prepared, new Set([row.rowId]), !row.included))}
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                      row.included ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/40 text-transparent',
                    )}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-on-surface">{row.description}</p>
                        <p className="mt-0.5 text-micro text-on-surface-variant">
                          {row.date} · source row {row.sourceRowNumber}
                        </p>
                      </div>
                      <p className={cn(
                        'shrink-0 text-sm font-extrabold',
                        row.type === 'income' ? 'text-secondary' : 'text-on-surface',
                      )}>
                        {amountLabel(row)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <CategoryBadge category={row.category} size="sm" />
                      <span className="text-xs font-bold text-on-surface">{row.category}</span>
                      {row.category === 'Uncategorized' && (
                        <span className="rounded-full bg-accent-amber/15 px-2 py-1 text-micro font-bold text-on-surface">
                          Needs category
                        </span>
                      )}
                      {hasFutureDate && (
                        <span className="rounded-full bg-accent-amber/15 px-2 py-1 text-micro font-bold text-on-surface">
                          Future date
                        </span>
                      )}
                      {row.duplicateMatches.length > 0 && (
                        <span className="rounded-full bg-tertiary/10 px-2 py-1 text-micro font-bold text-tertiary">
                          Possible duplicate
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="min-h-11"
                        onClick={() => {
                          setCategoryRowId(row.rowId);
                          setPendingCategory(row.category === 'Uncategorized' ? '' : row.category);
                        }}
                      >
                        <Tags className="h-4 w-4" aria-hidden="true" />
                        Set category
                      </Button>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={row.selectedForBatch}
                        onClick={() => onPreparedUpdated(setImportRowsSelected(
                          prepared,
                          new Set([row.rowId]),
                          !row.selectedForBatch,
                        ))}
                        className={cn(
                          'min-h-11 rounded-xl px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                          row.selectedForBatch
                            ? 'bg-primary/10 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant',
                        )}
                      >
                        {row.selectedForBatch ? 'Selected for batch' : 'Select for batch'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Review pages">
          <Button variant="ghost" size="sm" className="min-h-11" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>
          <span className="text-xs font-bold text-on-surface-variant">Page {page} of {pageCount}</span>
          <Button variant="ghost" size="sm" className="min-h-11" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}

      {categoryRow && (
        <section className="sticky bottom-0 z-10 space-y-3 rounded-3xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-xl" aria-label="Apply category">
          <div className="flex items-start gap-3">
            <Tags className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h4 className="text-sm font-bold text-on-surface">Apply a category</h4>
              <p className="mt-1 text-xs text-on-surface-variant">Choose the category, then confirm exactly which rows change.</p>
            </div>
          </div>
          <CategoryPicker
            categories={categories}
            value={pendingCategory}
            onChange={setPendingCategory}
            onAddCategory={onAddCategory}
            requiredSelection
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="secondary" size="sm" className="min-h-11" disabled={!pendingCategory} onClick={() => applyCategory('row')}>
              Only this row
            </Button>
            <Button variant="secondary" size="sm" className="min-h-11" disabled={!pendingCategory || selectedRows.length === 0} onClick={() => applyCategory('selected')}>
              Selected ({selectedRows.length})
            </Button>
            <Button variant="secondary" size="sm" className="min-h-11" disabled={!pendingCategory || sameDescriptionCount === 0} onClick={() => applyCategory('same-description')}>
              Same description ({sameDescriptionCount})
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="min-h-11" fullWidth onClick={() => setCategoryRowId(null)}>Cancel category change</Button>
        </section>
      )}

      {prepared.summary.includedRows === 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl bg-tertiary/10 p-3 text-tertiary">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-xs font-bold">Include at least one valid row before continuing.</p>
        </div>
      )}
    </div>
  );
}
