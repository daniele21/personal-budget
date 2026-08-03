import type { Transaction } from '../types';

const SPREADSHEET_FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeSpreadsheetFormula(value: string): string {
  return SPREADSHEET_FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function transactionCsvRecord(transaction: Transaction): Record<string, string | number | boolean | undefined> {
  const safe = (value: string | undefined) => value === undefined
    ? undefined
    : escapeSpreadsheetFormula(value);
  return {
    id: safe(transaction.id),
    amount: transaction.amount,
    type: transaction.type,
    category: safe(transaction.category),
    date: safe(transaction.date),
    title: safe(transaction.title),
    description: safe(transaction.description),
    paymentMethod: safe(transaction.paymentMethod),
    attachmentUrl: safe(transaction.attachmentUrl),
    verified: transaction.verified,
    sourceRecurringId: safe(transaction.sourceRecurringId),
    sourceMonthKey: safe(transaction.sourceMonthKey),
    recurringEdited: transaction.recurringEdited,
    reportingClass: transaction.reportingClass ?? 'regular',
    reportingNote: safe(transaction.reportingNote) ?? '',
  };
}
