import { describe, expect, it } from 'vitest';
import {
  applyImportCategorySuggestions,
  calculateImportSummary,
  createDescriptionMatchKey,
  type PreparedImportRow,
  type PreparedTransactionImport,
} from '..';

function prepared(): PreparedTransactionImport {
  const rows: PreparedImportRow[] = [
    {
      rowId: 'row-1',
      sourceRowNumber: 2,
      date: '2026-09-01',
      description: 'Known merchant',
      signedAmountMinor: -1200,
      type: 'expense',
      category: 'Uncategorized',
      categorySource: 'uncategorized',
      included: true,
      selectedForBatch: false,
      descriptionMatchKey: createDescriptionMatchKey('Known merchant', 'expense'),
      duplicateMatches: [],
      issues: [],
    },
    {
      rowId: 'row-2',
      sourceRowNumber: 3,
      date: '2026-09-02',
      description: 'New merchant',
      signedAmountMinor: -800,
      type: 'expense',
      category: 'Uncategorized',
      categorySource: 'uncategorized',
      included: true,
      selectedForBatch: false,
      descriptionMatchKey: createDescriptionMatchKey('New merchant', 'expense'),
      duplicateMatches: [],
      issues: [],
    },
  ];
  return {
    sourceKind: 'structured-csv',
    preparedAt: '2026-09-09T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

describe('applyImportCategorySuggestions', () => {
  it('applies local and Harnex suggestions to review state without creating undo history', () => {
    const input = prepared();
    const result = applyImportCategorySuggestions(input, [
      { rowIds: ['row-1'], category: 'Groceries', source: 'local-history' },
      { rowIds: ['row-2'], category: 'Travel', source: 'harnex' },
    ], ['Groceries', 'Travel']);

    expect(result.rows).toEqual([
      expect.objectContaining({ rowId: 'row-1', category: 'Groceries', categorySource: 'local-history' }),
      expect.objectContaining({ rowId: 'row-2', category: 'Travel', categorySource: 'harnex' }),
    ]);
    expect(result.summary.uncategorizedRows).toBe(0);
    expect(result.undoStack).toEqual([]);
  });

  it('rejects an inactive category before mutating any row', () => {
    const input = prepared();

    expect(() => applyImportCategorySuggestions(input, [
      { rowIds: ['row-1'], category: 'Invented', source: 'harnex' },
    ], ['Groceries'])).toThrow('import_category_not_active');
    expect(input.rows.every((row) => row.category === 'Uncategorized')).toBe(true);
  });

  it('rejects conflicting suggestions for the same row', () => {
    const input = prepared();

    expect(() => applyImportCategorySuggestions(input, [
      { rowIds: ['row-1'], category: 'Groceries', source: 'local-history' },
      { rowIds: ['row-1'], category: 'Travel', source: 'harnex' },
    ], ['Groceries', 'Travel'])).toThrow('import_category_suggestion_conflict');
  });
});
