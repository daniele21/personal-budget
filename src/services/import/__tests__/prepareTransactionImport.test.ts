import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../../types';
import { validateStructuredImport, type RawStructuredImportRow } from '../../../domain/import';
import {
  createImportLedgerFingerprint,
  prepareTransactionImport,
} from '../prepareTransactionImport';

const RAW_ROWS: RawStructuredImportRow[] = [
  { rowNumber: 1, cells: ['date', 'description', 'amount'] },
  { rowNumber: 2, cells: ['2026-08-01', 'Aura Market', '-10.00'] },
  { rowNumber: 3, cells: ['2026-08-01', ' AURA   MARKET ', '-10.00'] },
  { rowNumber: 4, cells: ['2026-08-02', 'Salary', '2500.00'] },
  { rowNumber: 5, cells: ['2026-02-30', 'Invalid', '-1.00'] },
];

function ledger(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? 'existing-1',
    amount: overrides.amount ?? 10,
    type: overrides.type ?? 'expense',
    category: overrides.category ?? 'Groceries',
    date: overrides.date ?? '2026-08-01T00:00:00.000Z',
    title: overrides.title ?? 'Aura Market',
    description: overrides.description ?? 'Aura Market',
    paymentMethod: overrides.paymentMethod ?? 'Card',
  };
}

describe('prepareTransactionImport', () => {
  it('prepares only valid rows, computes summary and attaches batch/ledger warnings', async () => {
    const validation = validateStructuredImport({
      sourceKind: 'structured-csv',
      rows: RAW_ROWS,
      csvDelimiter: ',',
      today: '2026-08-03',
    });
    const sourceLedger = [ledger()];
    const validationBefore = structuredClone(validation);
    const ledgerBefore = structuredClone(sourceLedger);
    const prepared = await prepareTransactionImport(validation, sourceLedger, {
      preparedAt: '2026-08-03T12:00:00.000Z',
    });

    expect(prepared.rows).toHaveLength(3);
    expect(prepared.rows[0]?.duplicateMatches.map((match) => match.source)).toEqual(['batch', 'ledger']);
    expect(prepared.rows[1]?.duplicateMatches.map((match) => match.source)).toEqual(['batch', 'ledger']);
    expect(prepared.rows[2]?.duplicateMatches).toEqual([]);
    expect(prepared.summary).toEqual({
      totalRows: 3,
      includedRows: 3,
      excludedRows: 0,
      incomeMinor: 250000,
      expenseMinor: 2000,
      netMinor: 248000,
      uncategorizedRows: 3,
      warningRows: 2,
      possibleDuplicateRows: 2,
    });
    expect(prepared.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'date_invalid',
      'possible_duplicate',
      'uncategorized_rows',
    ]));
    expect(validation).toEqual(validationBefore);
    expect(sourceLedger).toEqual(ledgerBefore);
  });

  it('fingerprints deterministic duplicate/collision fields but not category or input order', async () => {
    const first = ledger();
    const second = ledger({ id: 'existing-2', description: 'Salary', amount: 2500, type: 'income' });
    const expected = await createImportLedgerFingerprint([first, second]);
    expect(await createImportLedgerFingerprint([second, first])).toBe(expected);
    expect(await createImportLedgerFingerprint([{ ...first, category: 'Changed' }, second])).toBe(expected);
    expect(await createImportLedgerFingerprint([{ ...first, amount: 10.01 }, second])).not.toBe(expected);
    expect(await createImportLedgerFingerprint([{ ...first, id: 'changed-id' }, second])).not.toBe(expected);
  });

  it('keeps issue objects free of financial content and filenames', async () => {
    const validation = validateStructuredImport({
      sourceKind: 'structured-csv',
      rows: RAW_ROWS,
      csvDelimiter: ',',
      today: '2026-08-03',
    });
    const prepared = await prepareTransactionImport(validation, [ledger()]);
    const serializedIssues = JSON.stringify(prepared.issues);
    expect(serializedIssues).not.toContain('Aura Market');
    expect(serializedIssues).not.toContain('2500');
    expect(serializedIssues).not.toContain('.csv');
  });
});

