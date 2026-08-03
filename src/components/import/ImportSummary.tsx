import React, { useMemo } from 'react';
import { CheckCircle, CopyCheck, Tags, TrendingDown, TrendingUp } from 'lucide-react';
import type { ImportSummary as ImportReviewSummary } from '../../domain/import';
import type { Transaction } from '../../types';
import { APP_CONFIG } from '../../constants';
import { CategoryBadge } from '../ui/CategoryBadge';
import { Button } from '../ui';

interface ImportSummaryProps {
  importedTransactions: Transaction[];
  reviewSummary: ImportReviewSummary;
  duplicateRowsKept: number;
  onViewUncategorized?: () => void;
}

export function ImportSummary({
  importedTransactions,
  reviewSummary,
  duplicateRowsKept,
  onViewUncategorized,
}: ImportSummaryProps) {
  const stats = useMemo(() => {
    const expenses = importedTransactions.filter((transaction) => transaction.type === 'expense');
    const income = importedTransactions.filter((transaction) => transaction.type === 'income');
    const categoryMap = new Map<string, number>();
    for (const transaction of importedTransactions) {
      categoryMap.set(transaction.category, (categoryMap.get(transaction.category) ?? 0) + 1);
    }
    return {
      expenses: expenses.length,
      income: income.length,
      totalExpenses: expenses.reduce((sum, transaction) => sum + transaction.amount, 0),
      totalIncome: income.reduce((sum, transaction) => sum + transaction.amount, 0),
      categories: [...categoryMap.entries()].sort((left, right) => right[1] - left[1]),
    };
  }, [importedTransactions]);

  const visibleCategories = stats.categories.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center" role="status">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
          <CheckCircle className="h-8 w-8 text-secondary" aria-hidden="true" />
        </div>
        <h3 className="font-headline text-lg font-bold text-on-surface">Import complete</h3>
        <p className="text-sm text-on-surface-variant">
          {importedTransactions.length} transaction{importedTransactions.length === 1 ? '' : 's'} imported.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-container-low p-4 text-center">
          <TrendingDown className="mx-auto mb-1 h-4 w-4 text-tertiary" aria-hidden="true" />
          <p className="font-headline font-extrabold text-on-surface">
            {APP_CONFIG.currency}{stats.totalExpenses.toFixed(2)}
          </p>
          <p className="text-micro text-on-surface-variant">{stats.expenses} expenses</p>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-4 text-center">
          <TrendingUp className="mx-auto mb-1 h-4 w-4 text-secondary" aria-hidden="true" />
          <p className="font-headline font-extrabold text-on-surface">
            {APP_CONFIG.currency}{stats.totalIncome.toFixed(2)}
          </p>
          <p className="text-micro text-on-surface-variant">{stats.income} income</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface-container-low p-3">
          <p className="text-base font-extrabold text-on-surface">{reviewSummary.excludedRows}</p>
          <p className="text-micro text-on-surface-variant">Excluded</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-3">
          <Tags className="mx-auto mb-1 h-4 w-4 text-accent-amber" aria-hidden="true" />
          <p className="text-base font-extrabold text-on-surface">{reviewSummary.uncategorizedRows}</p>
          <p className="text-micro text-on-surface-variant">Uncategorized</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-3">
          <CopyCheck className="mx-auto mb-1 h-4 w-4 text-tertiary" aria-hidden="true" />
          <p className="text-base font-extrabold text-on-surface">{duplicateRowsKept}</p>
          <p className="text-micro text-on-surface-variant">Duplicates kept</p>
        </div>
      </div>

      {reviewSummary.uncategorizedRows > 0 && onViewUncategorized && (
        <Button variant="secondary" fullWidth onClick={onViewUncategorized}>
          Review Uncategorized in history
        </Button>
      )}

      {visibleCategories.length > 0 && (
        <section className="space-y-2" aria-label="Imported categories">
          <h4 className="text-micro font-bold text-on-surface-variant">Top categories</h4>
          {visibleCategories.map(([category, count]) => (
            <div key={category} className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2">
              <CategoryBadge category={category} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-on-surface">{category}</span>
              <span className="text-micro font-bold text-on-surface-variant">{count}</span>
            </div>
          ))}
          {stats.categories.length > visibleCategories.length && (
            <p className="text-center text-micro text-on-surface-variant">
              And {stats.categories.length - visibleCategories.length} more categories.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
