import { useEffect, useRef } from 'react';
import { RecurringExpense, Transaction } from '../types';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatters';

/**
 * Checks recurring expenses and auto-generates transactions for any
 * that are due today or overdue (within the current month).
 *
 * Uses localStorage to track which recurring items have already been
 * processed for each due date, avoiding duplicate generation.
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

    // Load already-generated recurring keys from localStorage
    const generatedRaw = localStorage.getItem('aura_recurring_generated');
    const generated: Record<string, string> = generatedRaw ? JSON.parse(generatedRaw) : {};

    const newTransactions: Transaction[] = [];

    recurring.forEach(bill => {
      const dueDate = new Date(bill.dueDate);
      
      // For monthly bills, check if the bill is due this month
      // and hasn't been generated yet for this month
      const monthKey = `${bill.id}_${today.getFullYear()}_${today.getMonth()}`;
      
      if (generated[monthKey]) return; // Already generated this month

      // Check if the due day has passed or is today
      const dueDayThisMonth = new Date(today.getFullYear(), today.getMonth(), dueDate.getDate());
      
      if (dueDayThisMonth <= today) {
        const newTx: Transaction = {
          id: `rec_${bill.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          amount: bill.amount,
          type: 'expense',
          category: bill.category,
          date: dueDayThisMonth.toISOString(),
          title: bill.name,
          description: `Auto-generated from recurring: ${bill.name}`,
          paymentMethod: 'Bank Transfer',
        };

        newTransactions.push(newTx);
        generated[monthKey] = new Date().toISOString();
      }
    });

    if (newTransactions.length > 0) {
      setTransactions([...newTransactions, ...transactions]);
      localStorage.setItem('aura_recurring_generated', JSON.stringify(generated));

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
