import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../types';
import { escapeSpreadsheetFormula, transactionCsvRecord } from '../transactionCsvExport';

const transaction: Transaction = {
  id: '=unsafe-id',
  amount: 12.5,
  type: 'expense',
  category: '+Category',
  date: '2026-08-03T00:00:00.000Z',
  title: '-Formula title',
  description: '@HYPERLINK("https://invalid.example")',
  paymentMethod: '\tCommand',
  reportingClass: 'extra',
  reportingNote: '\rFormula note',
};

describe('transaction CSV export safety', () => {
  it.each(['=SUM(1,1)', '+cmd', '-1+2', '@HYPERLINK()', '\tformula', '\rformula'])(
    'escapes spreadsheet formula prefix %j',
    (value) => expect(escapeSpreadsheetFormula(value)).toBe(`'${value}`),
  );

  it('escapes every persisted string field without changing typed financial fields', () => {
    expect(transactionCsvRecord(transaction)).toEqual(expect.objectContaining({
      id: "'=unsafe-id",
      amount: 12.5,
      type: 'expense',
      category: "'+Category",
      title: "'-Formula title",
      description: "'@HYPERLINK(\"https://invalid.example\")",
      paymentMethod: "'\tCommand",
      reportingClass: 'extra',
      reportingNote: "'\rFormula note",
    }));
  });
});
