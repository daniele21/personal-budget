import { useEffect, useRef } from 'react';
import { RecurringExpense, Transaction } from '../types';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatters';
import { getRecurringDue } from '../domain/finance';

/**
 * Checks recurring expenses and auto-generates transactions for any
 * that are due today or overdue since their configured start date.
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
  const lastProcessedSignatureRef = useRef('');

  useEffect(() => {
    if (recurring.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newTransactions = getRecurringDue(recurring, transactions, today)
      .map(({ transaction }) => transaction);
    const signature = newTransactions
      .map((transaction) => `${transaction.sourceRecurringId}:${transaction.sourceMonthKey}`)
      .sort()
      .join('|');

    if (!signature || signature === lastProcessedSignatureRef.current) {
      return;
    }

    lastProcessedSignatureRef.current = signature;

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
