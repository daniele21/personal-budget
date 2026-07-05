import { Transaction } from '../types';

export interface TransactionDateGroup {
  key: string;
  label: string;
  netTotal: number;
  transactions: Transaction[];
}

function getDateKey(date: string): string {
  return date.slice(0, 10);
}

function isSameDateKey(date: Date, key: string): boolean {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-') === key;
}

function formatGroupLabel(key: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDateKey(today, key)) return 'Today';
  if (isSameDateKey(yesterday, key)) return 'Yesterday';

  return new Date(`${key}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: today.getFullYear() === Number(key.slice(0, 4)) ? undefined : 'numeric',
  });
}

export function groupTransactionsByDate(transactions: Transaction[]): TransactionDateGroup[] {
  const groups = new Map<string, Transaction[]>();

  transactions.forEach((transaction) => {
    const key = getDateKey(transaction.date);
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, groupTransactions]) => {
      const sortedTransactions = [...groupTransactions].sort((left, right) => (
        new Date(right.date).getTime() - new Date(left.date).getTime()
      ));
      const netTotal = sortedTransactions.reduce((sum, transaction) => (
        sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount)
      ), 0);

      return {
        key,
        label: formatGroupLabel(key),
        netTotal,
        transactions: sortedTransactions,
      };
    });
}
