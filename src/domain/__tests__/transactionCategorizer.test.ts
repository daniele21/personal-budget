import { describe, expect, it } from 'vitest';
import {
  detectHeaderColumnMapping,
  detectSplitAmountColumns,
  extractTransactionsLocally,
  mergeColumnMapping,
  mergeCategorizationResults,
  normalizeImportedDate,
} from '../transactionCategorizer';

describe('normalizeImportedDate', () => {
  it('keeps ISO-like dates in date input format', () => {
    expect(normalizeImportedDate('2026-04-27')).toBe('2026-04-27');
    expect(normalizeImportedDate('2026/04/27 12:30')).toBe('2026-04-27');
  });

  it('parses European day-first bank export dates', () => {
    expect(normalizeImportedDate('27/04/2026', 'DD/MM/YYYY')).toBe('2026-04-27');
    expect(normalizeImportedDate('27.04.2026', 'DD.MM.YYYY')).toBe('2026-04-27');
    expect(normalizeImportedDate('27-04-26', 'DD-MM-YY')).toBe('2026-04-27');
  });

  it('parses month-first dates when the detected format says MM/DD/YYYY', () => {
    expect(normalizeImportedDate('04/27/2026', 'MM/DD/YYYY')).toBe('2026-04-27');
  });

  it('parses Excel serial dates from raw spreadsheet cells', () => {
    expect(normalizeImportedDate('46139')).toBe('2026-04-27');
  });

  it('returns undefined for invalid or empty dates', () => {
    expect(normalizeImportedDate('')).toBeUndefined();
    expect(normalizeImportedDate('not a date')).toBeUndefined();
    expect(normalizeImportedDate('31/02/2026', 'DD/MM/YYYY')).toBeUndefined();
  });
});

describe('detectSplitAmountColumns', () => {
  it('detects Italian bank exports with separate credit and debit columns', () => {
    expect(detectSplitAmountColumns([
      ['Data contabile', 'Data valuta', 'Accrediti', 'Addebiti', 'Descrizione'],
    ])).toEqual({ creditCol: 2, debitCol: 3 });
  });

  it('detects descriptive multi-bank credit and debit amount headers', () => {
    expect(detectSplitAmountColumns([
      ['Booking date', 'Merchant', 'Credit amount', 'Debit amount'],
    ])).toEqual({ creditCol: 2, debitCol: 3 });
  });
});

describe('detectHeaderColumnMapping', () => {
  it('detects date, description, credit, and debit columns from common bank headers', () => {
    expect(detectHeaderColumnMapping([
      ['Data contabile', 'Data valuta', 'Accrediti', 'Addebiti', 'Descrizione'],
    ])).toEqual({
      dateCol: 0,
      descCol: 4,
      creditCol: 2,
      debitCol: 3,
    });
  });
});

describe('mergeColumnMapping', () => {
  it('lets explicit local headers correct a bad Gemini description mapping', () => {
    const rows = [
      ['Data contabile', 'Data valuta', 'Accrediti', 'Addebiti', 'Descrizione'],
      ['2025-01-06T04:00:00.000Z', '2025-01-03T04:00:00.000Z', '', '-450', 'Rent transfer'],
      ['2025-01-28T04:00:00.000Z', '2025-01-28T04:00:00.000Z', '2619', '', 'Salary payment'],
    ];

    const mapping = mergeColumnMapping(rows, {
      dateCol: 0,
      descCol: 3,
      amountCol: 3,
      amountDecimal: '.',
      dateFormat: 'YYYY-MM-DD',
    });

    expect(mapping).toEqual({
      dateCol: 0,
      descCol: 4,
      amountCol: 3,
      creditCol: 2,
      debitCol: 3,
      amountDecimal: '.',
      dateFormat: 'YYYY-MM-DD',
    });

    expect(extractTransactionsLocally(rows, mapping)).toMatchObject([
      {
        description: 'Rent transfer',
        amount: 450,
        typeHint: 'expense',
      },
      {
        description: 'Salary payment',
        amount: 2619,
        typeHint: 'income',
      },
    ]);
  });
});

describe('extractTransactionsLocally', () => {
  it('keeps both incomes and expenses when the bank export has separate amount columns', () => {
    const rows = [
      ['Data contabile', 'Data valuta', 'Accrediti', 'Addebiti', 'Descrizione'],
      ['2025-01-06T04:00:00.000Z', '2025-01-03T04:00:00.000Z', '', '-450', 'Rent transfer'],
      ['2025-01-28T04:00:00.000Z', '2025-01-28T04:00:00.000Z', '2619', '', 'Salary payment'],
    ];

    expect(extractTransactionsLocally(rows, {
      dateCol: 0,
      descCol: 4,
      amountCol: 3,
      amountDecimal: '.',
      dateFormat: 'YYYY-MM-DD',
    })).toMatchObject([
      {
        description: 'Rent transfer',
        amount: 450,
        signedAmount: -450,
        typeHint: 'expense',
        date: '2025-01-06',
      },
      {
        description: 'Salary payment',
        amount: 2619,
        signedAmount: 2619,
        typeHint: 'income',
        date: '2025-01-28',
      },
    ]);
  });

  it('falls back to a single signed amount column for generic exports', () => {
    const rows = [
      ['Date', 'Description', 'Amount'],
      ['2026-04-01', 'Coffee', '-2.50'],
      ['2026-04-02', 'Refund', '12.30'],
    ];

    expect(extractTransactionsLocally(rows, {
      dateCol: 0,
      descCol: 1,
      amountCol: 2,
      amountDecimal: '.',
      dateFormat: 'YYYY-MM-DD',
    })).toMatchObject([
      {
        description: 'Coffee',
        amount: 2.5,
        signedAmount: -2.5,
        typeHint: 'expense',
      },
      {
        description: 'Refund',
        amount: 12.3,
        signedAmount: 12.3,
        typeHint: undefined,
      },
    ]);
  });

  it('uses AI-detected split amount columns when headers are not recognizable locally', () => {
    const rows = [
      ['When', 'Details', 'Column A', 'Column B'],
      ['2026-04-01', 'Incoming transfer', '1000', ''],
      ['2026-04-02', 'Card payment', '', '25'],
    ];

    expect(extractTransactionsLocally(rows, {
      dateCol: 0,
      descCol: 1,
      amountCol: -1,
      creditCol: 2,
      debitCol: 3,
      amountDecimal: '.',
      dateFormat: 'YYYY-MM-DD',
    })).toMatchObject([
      {
        description: 'Incoming transfer',
        amount: 1000,
        signedAmount: 1000,
        typeHint: 'income',
      },
      {
        description: 'Card payment',
        amount: 25,
        signedAmount: -25,
        typeHint: 'expense',
      },
    ]);
  });

  it('keeps dated amount rows even when the bank leaves the description empty', () => {
    const rows = [
      ['Data contabile', 'Data valuta', 'Accrediti', 'Addebiti', 'Descrizione'],
      ['2025-07-31T04:00:00.000Z', '2025-07-28T04:00:00.000Z', '14.98', '', ''],
    ];

    expect(extractTransactionsLocally(rows, {
      dateCol: 0,
      descCol: 4,
      amountCol: 3,
      amountDecimal: '.',
      dateFormat: 'YYYY-MM-DD',
    })).toMatchObject([
      {
        description: 'Accredito 2025-07-31',
        amount: 14.98,
        signedAmount: 14.98,
        typeHint: 'income',
        date: '2025-07-31',
      },
    ]);
  });
});

describe('mergeCategorizationResults', () => {
  it('keeps locally extracted credit rows even when Gemini omits them from categorization', () => {
    const localTransactions = extractTransactionsLocally([
      ['Data contabile', 'Data valuta', 'Accrediti', 'Addebiti', 'Descrizione'],
      ['2025-01-06T04:00:00.000Z', '2025-01-03T04:00:00.000Z', '', '-450', 'Rent transfer'],
      ['2025-01-28T04:00:00.000Z', '2025-01-28T04:00:00.000Z', '2619', '', 'Salary payment'],
    ], {
      dateCol: 0,
      descCol: 4,
      amountCol: 3,
      amountDecimal: '.',
      dateFormat: 'YYYY-MM-DD',
    });

    expect(mergeCategorizationResults(localTransactions, [
      {
        id: 0,
        title: 'Rent',
        category: 'Casa',
        confidence: 'high',
        type: 'expense',
      },
    ], ['Casa', 'Income'])).toEqual([
      {
        index: 0,
        description: 'Rent transfer',
        amount: 450,
        date: '2025-01-06',
        title: 'Rent',
        category: 'Casa',
        confidence: 'high',
        type: 'expense',
      },
      {
        index: 1,
        description: 'Salary payment',
        amount: 2619,
        date: '2025-01-28',
        title: 'Salary payment',
        category: 'Casa',
        confidence: 'low',
        type: 'income',
      },
    ]);
  });
});
