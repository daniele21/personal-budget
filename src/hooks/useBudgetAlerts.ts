import { useEffect, useRef } from 'react';
import { Budget, Transaction } from '../types';
import { filterByMonth } from '../domain/finance';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatters';

/**
 * Checks budgets against monthly spending and fires toast notifications
 * when thresholds are crossed (80%, 100%).
 * 
 * Uses a ref to track which alerts have already been shown this session
 * to avoid spamming the user on every render.
 */
export function useBudgetAlerts(budgets: Budget[], transactions: Transaction[]) {
  const { toast } = useToast();
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const monthlyTransactions = filterByMonth(transactions);

    budgets.forEach(budget => {
      const spent = monthlyTransactions
        .filter(t => t.category === budget.category && t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

      const percent = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      const key100 = `${budget.category}_100`;
      const key80 = `${budget.category}_80`;

      if (percent >= 100 && !alertedRef.current.has(key100)) {
        alertedRef.current.add(key100);
        alertedRef.current.add(key80); // Don't also fire the 80% alert
        toast(
          `🚨 ${budget.category} budget exceeded! ${formatCurrency(spent)} of ${formatCurrency(budget.limit)}`,
          'error',
          5000
        );
      } else if (percent >= 80 && percent < 100 && !alertedRef.current.has(key80)) {
        alertedRef.current.add(key80);
        toast(
          `⚠️ ${budget.category} at ${Math.round(percent)}% — ${formatCurrency(budget.limit - spent)} left`,
          'warning',
          4000
        );
      }
    });
  }, [budgets, transactions, toast]);
}
