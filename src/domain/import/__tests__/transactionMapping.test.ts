import { describe, expect, it } from 'vitest';
import {
  createDescriptionMatchKey,
  createImportIssue,
  mapPreparedImportRowsToTransactions,
  type PreparedImportRow,
} from '..';

function row(overrides: Partial<PreparedImportRow> = {}): PreparedImportRow {
  const description = overrides.description ?? 'Synthetic transaction';
  const type = overrides.type ?? 'expense';
  return {
    rowId: overrides.rowId ?? 'row-1',
    sourceRowNumber: overrides.sourceRowNumber ?? 2,
    date: overrides.date ?? '2026-08-01',
    description,
    signedAmountMinor: overrides.signedAmountMinor ?? -1234,
    type,
    category: overrides.category ?? 'Groceries',
    categorySource: overrides.categorySource ?? 'manual',
    included: overrides.included ?? true,
    selectedForBatch: overrides.selectedForBatch ?? false,
    descriptionMatchKey: overrides.descriptionMatchKey ?? createDescriptionMatchKey(description, type),
    duplicateMatches: overrides.duplicateMatches ?? [],
    issues: overrides.issues ?? [],
  };
}

describe('transaction mapping', () => {
  it('creates only the canonical transaction fields and retries UUID collisions', () => {
    const ids = ['existing-id', 'new-id'];
    const uuidFactory = () => ids.shift() ?? 'unexpected';
    const source = [row()];
    const snapshot = structuredClone(source);
    const result = mapPreparedImportRowsToTransactions(source, new Set(['existing-id']), uuidFactory);
    expect(result).toEqual([{
      id: 'new-id',
      amount: 12.34,
      type: 'expense',
      category: 'Groceries',
      date: '2026-08-01T00:00:00.000Z',
      title: 'Synthetic transaction',
      description: 'Synthetic transaction',
      paymentMethod: 'Bank Transfer',
    }]);
    expect(source).toEqual(snapshot);
  });

  it('limits titles by Unicode code points and maps signed income cents', () => {
    const description = `${'😀'.repeat(80)}tail`;
    const [transaction] = mapPreparedImportRowsToTransactions([
      row({ description, type: 'income', signedAmountMinor: 123_456 }),
    ], new Set(), () => 'income-id');
    expect(transaction?.title).toBe('😀'.repeat(80));
    expect(transaction).toMatchObject({ amount: 1234.56, type: 'income' });
  });

  it('maps only included rows without blocking issues', () => {
    const result = mapPreparedImportRowsToTransactions([
      row({ rowId: 'included' }),
      row({ rowId: 'excluded', included: false }),
      row({
        rowId: 'invalid',
        issues: [createImportIssue('amount_format', 'error', { rowNumber: 4, column: 'amount' })],
      }),
    ], new Set(), () => 'only-id');
    expect(result).toHaveLength(1);
  });

  it('fails closed when a secure unique identifier cannot be obtained', () => {
    expect(() => mapPreparedImportRowsToTransactions(
      [row()],
      new Set(['collision']),
      () => 'collision',
    )).toThrow('transaction_id_collision_limit');
  });
});
