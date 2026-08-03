import type { Transaction } from '../../types';
import { normalizeImportDescription } from './descriptionMatching';
import type {
  DuplicateDetectionKey,
  DuplicateMatch,
  PreparedImportRow,
} from './structuredImportTypes';

export const DUPLICATE_KEY_VERSION = 'v1' as const;

export function createDuplicateDetectionKey(
  date: string,
  signedAmountMinor: number,
  description: string,
): DuplicateDetectionKey {
  return `duplicate:${DUPLICATE_KEY_VERSION}|${date}|${signedAmountMinor}|${normalizeImportDescription(description)}` as DuplicateDetectionKey;
}

function ledgerCalendarDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : date;
}

export function transactionDuplicateDetectionKey(transaction: Transaction): DuplicateDetectionKey {
  const absoluteMinor = Math.round(Math.abs(transaction.amount) * 100);
  const signedMinor = transaction.type === 'expense' ? -absoluteMinor : absoluteMinor;
  return createDuplicateDetectionKey(
    ledgerCalendarDate(transaction.date),
    signedMinor,
    transaction.description,
  );
}

export function attachDuplicateMatches(
  rows: readonly PreparedImportRow[],
  ledger: readonly Transaction[],
): PreparedImportRow[] {
  const batchGroups = new Map<DuplicateDetectionKey, { firstRowId: string; count: number }>();
  for (const row of rows) {
    const key = createDuplicateDetectionKey(row.date, row.signedAmountMinor, row.description);
    const group = batchGroups.get(key);
    if (group) group.count += 1;
    else batchGroups.set(key, { firstRowId: row.rowId, count: 1 });
  }

  const ledgerGroups = new Map<DuplicateDetectionKey, { firstTransactionId: string; count: number }>();
  for (const transaction of ledger) {
    const key = transactionDuplicateDetectionKey(transaction);
    const group = ledgerGroups.get(key);
    if (group) group.count += 1;
    else ledgerGroups.set(key, { firstTransactionId: transaction.id, count: 1 });
  }

  return rows.map((row) => {
    const key = createDuplicateDetectionKey(row.date, row.signedAmountMinor, row.description);
    const matches: DuplicateMatch[] = [];
    const batch = batchGroups.get(key);
    if (batch && batch.count > 1) {
      matches.push({
        source: 'batch',
        referenceId: batch.firstRowId,
        count: batch.count - 1,
      });
    }
    const existing = ledgerGroups.get(key);
    if (existing) {
      matches.push({
        source: 'ledger',
        referenceId: existing.firstTransactionId,
        count: existing.count,
      });
    }
    return { ...row, duplicateMatches: matches };
  });
}
