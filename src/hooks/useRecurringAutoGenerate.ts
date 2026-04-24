import { useEffect, useRef } from 'react';
import { RecurringExpense, Transaction } from '../types';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatters';
import { getRecurringDue } from '../domain/finance';

/**
 * Checks recurring expenses and auto-generates transactions for any
 * that are due today or overdue (within the current month).
 *
 * Dedupes against the existing transaction list so restored devices
 * converge on the same monthly state without relying on local-only flags.
 */
export function useRecurringAutoGenerate(
  recurring: RecurringExpense[],
  transactions: Transaction[],
  setTransactions: (txs: Transaction[]) => void
) {
  const { toast } = useToast();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current || recurring.length === 0) return;
    processedRef.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newTransactions = getRecurringDue(recurring, transactions, today)
      .map(({ transaction }) => transaction);

    if (newTransactions.length > 0) {
      setTransactions([...newTransactions, ...transactions]);

      if (newTransactions.length === 1) {
        toast(
          `📅 "${newTransactions[0].title}" (${formatCurrency(newTransactions[0].amount)}) added automatically`,
          'info',
          4000
        );
      } else {
        toast(
          `📅 ${newTransactions.length} recurring bills added automatically`,
          'info',
          4000
        );
      }
    }
  }, [recurring, transactions, setTransactions, toast]);
}
