import { describe, expect, it } from 'vitest';
import {
  applyImportCategory,
  calculateImportSummary,
  createDescriptionMatchKey,
  excludeAllPossibleDuplicates,
  revalidateImportCategories,
  setImportRowsIncluded,
  setImportRowsSelected,
  undoLastImportReviewChange,
  type PreparedImportRow,
  type PreparedTransactionImport,
} from '..';

function row(overrides: Partial<PreparedImportRow> = {}): PreparedImportRow {
  const description = overrides.description ?? 'Market';
  const type = overrides.type ?? 'expense';
  return {
    rowId: overrides.rowId ?? 'row-1',
    sourceRowNumber: overrides.sourceRowNumber ?? 2,
    date: overrides.date ?? '2026-08-01',
    description,
    signedAmountMinor: overrides.signedAmountMinor ?? -1000,
    type,
    category: overrides.category ?? 'Uncategorized',
    categorySource: overrides.categorySource ?? 'uncategorized',
    included: overrides.included ?? true,
    selectedForBatch: overrides.selectedForBatch ?? false,
    descriptionMatchKey: overrides.descriptionMatchKey ?? createDescriptionMatchKey(description, type),
    duplicateMatches: overrides.duplicateMatches ?? [],
    issues: overrides.issues ?? [],
  };
}

function prepared(): PreparedTransactionImport {
  const rows = [
    row({ rowId: 'row-1' }),
    row({ rowId: 'row-2', description: ' MARKET ' }),
    row({ rowId: 'row-3', type: 'income', signedAmountMinor: 1000 }),
    row({ rowId: 'row-4', description: 'Other', duplicateMatches: [{ source: 'ledger', referenceId: 'tx-1', count: 1 }] }),
  ];
  return {
    sourceKind: 'structured-csv',
    preparedAt: '2026-08-03T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

describe('import review commands', () => {
  it('applies a category to the same normalized description and type, then undoes it', () => {
    const original = prepared();
    const snapshot = structuredClone(original);
    const changed = applyImportCategory(original, {
      rowId: 'row-1',
      category: 'Groceries',
      scope: 'same-description',
      activeCategories: ['Groceries'],
    });
    expect(changed.rows.map((item) => item.category)).toEqual([
      'Groceries',
      'Groceries',
      'Uncategorized',
      'Uncategorized',
    ]);
    expect(changed.rows.slice(0, 2).map((item) => item.categorySource)).toEqual([
      'same-description',
      'same-description',
    ]);
    expect(undoLastImportReviewChange(changed).rows).toEqual(original.rows);
    expect(original).toEqual(snapshot);
  });

  it('keeps selection separate from inclusion and supports selected batch categorization', () => {
    const selected = setImportRowsSelected(prepared(), new Set(['row-1', 'row-3']), true);
    expect(selected.rows.filter((item) => item.selectedForBatch).map((item) => item.rowId)).toEqual(['row-1', 'row-3']);
    expect(selected.summary.includedRows).toBe(4);
    const categorized = applyImportCategory(selected, {
      rowId: 'row-1',
      category: 'Reviewed',
      scope: 'selected',
      activeCategories: ['Reviewed'],
    });
    expect(categorized.rows.map((item) => item.category)).toEqual([
      'Reviewed',
      'Uncategorized',
      'Reviewed',
      'Uncategorized',
    ]);
  });

  it('rejects inactive categories and invalidates a category deleted during review', () => {
    expect(() => applyImportCategory(prepared(), {
      rowId: 'row-1',
      category: 'Archived',
      scope: 'row',
      activeCategories: ['Groceries'],
    })).toThrow('import_category_not_active');

    const categorized = applyImportCategory(prepared(), {
      rowId: 'row-1',
      category: 'Groceries',
      scope: 'row',
      activeCategories: ['Groceries'],
    });
    const invalidated = revalidateImportCategories(categorized, []);
    expect(invalidated.rows[0]).toMatchObject({ category: 'Uncategorized', categorySource: 'uncategorized' });
    expect(invalidated.undoStack).toHaveLength(1);
    expect(undoLastImportReviewChange(invalidated).rows[0]).toMatchObject({
      category: 'Uncategorized',
      categorySource: 'uncategorized',
    });
  });

  it('excludes and re-includes rows with exact undo and summary conservation', () => {
    const original = prepared();
    const excluded = setImportRowsIncluded(original, new Set(['row-1', 'row-2']), false);
    expect(excluded.summary).toMatchObject({ includedRows: 2, excludedRows: 2, expenseMinor: 1000 });
    expect(undoLastImportReviewChange(excluded).summary).toEqual(original.summary);

    const duplicatesExcluded = excludeAllPossibleDuplicates(original);
    expect(duplicatesExcluded.rows[3]?.included).toBe(false);
    expect(undoLastImportReviewChange(duplicatesExcluded).rows).toEqual(original.rows);
  });

  it('preserves count and money invariants across deterministic include/exclude sequences', () => {
    let state = prepared();
    const initialSignedTotal = state.rows.reduce((sum, item) => sum + item.signedAmountMinor, 0);
    for (const rowId of state.rows.map((item) => item.rowId)) {
      state = setImportRowsIncluded(state, new Set([rowId]), false);
      expect(state.summary.includedRows + state.summary.excludedRows).toBe(state.summary.totalRows);
      expect(state.rows.reduce((sum, item) => sum + item.signedAmountMinor, 0)).toBe(initialSignedTotal);
    }
    while (state.undoStack.length > 0) state = undoLastImportReviewChange(state);
    expect(state.rows).toEqual(prepared().rows);
  });
});
