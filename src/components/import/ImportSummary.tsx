/**
 * ImportSummary — Final step of the import wizard.
 *
 * Shows a summary of what was imported: count, categories breakdown,
 * total amounts for expenses/income. Confirms the import is complete.
 */
import React, { useMemo } from 'react';
import { CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { APP_CONFIG } from '../../constants';
import { CategoryBadge } from '../ui/CategoryBadge';
import { cn } from '../../lib/utils';
import type { Transaction } from '../../types';

interface ImportSummaryProps {
  importedTransactions: Transaction[];
}

export function ImportSummary({ importedTransactions }: ImportSummaryProps) {
  const stats = useMemo(() => {
    const expenses = importedTransactions.filter((t) => t.type === 'expense');
    const income = importedTransactions.filter((t) => t.type === 'income');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

    // Category breakdown
    const categoryMap = new Map<string, number>();
    importedTransactions.forEach((t) => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1);
    });
    const categories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1]);

    return { expenses: expenses.length, income: income.length, totalExpenses, totalIncome, categories };
  }, [importedTransactions]);

  return (
    <div className="space-y-6">
      {/* Success animation */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-secondary" />
        </div>
        <h3 className="font-headline font-bold text-on-surface text-lg">Import Complete!</h3>
        <p className="text-sm text-on-surface-variant">
          {importedTransactions.length} transaction{importedTransactions.length !== 1 ? 's' : ''} imported successfully
        </p>
      </div>

      {/* Amount summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container-low rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="w-4 h-4 text-tertiary" />
            <span className="text-micro font-bold text-on-surface-variant">Expenses</span>
          </div>
          <p className="font-headline font-extrabold text-on-surface">
            {APP_CONFIG.currency}{stats.totalExpenses.toFixed(2)}
          </p>
          <p className="text-micro text-on-surface-variant">{stats.expenses} transactions</p>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <span className="text-micro font-bold text-on-surface-variant">Income</span>
          </div>
          <p className="font-headline font-extrabold text-on-surface">
            {APP_CONFIG.currency}{stats.totalIncome.toFixed(2)}
          </p>
          <p className="text-micro text-on-surface-variant">{stats.income} transactions</p>
        </div>
      </div>

      {/* Category breakdown */}
      {stats.categories.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-micro font-bold text-on-surface-variant">By Category</h4>
          <div className="space-y-1.5">
            {stats.categories.map(([category, count]) => (
              <div
                key={category}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container-low"
              >
                <CategoryBadge category={category} size="sm" />
                <span className="text-sm font-bold text-on-surface flex-1">{category}</span>
                <span className="text-micro font-bold text-on-surface-variant">
                  {count} tx{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
