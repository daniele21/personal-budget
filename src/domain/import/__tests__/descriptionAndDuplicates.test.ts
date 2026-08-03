import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../../types';
import {
  attachDuplicateMatches,
  createDescriptionMatchKey,
  createDuplicateDetectionKey,
  groupPreparedRowsByDescription,
  normalizeImportDescription,
  type PreparedImportRow,
} from '..';

function row(overrides: Partial<PreparedImportRow> = {}): PreparedImportRow {
  const description = overrides.description ?? 'Aura Market 42!';
  const type = overrides.type ?? 'expense';
  return {
    rowId: overrides.rowId ?? 'row-1',
    sourceRowNumber: overrides.sourceRowNumber ?? 2,
    date: overrides.date ?? '2026-08-01',
    description,
    signedAmountMinor: overrides.signedAmountMinor ?? -1_000,
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

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? 'ledger-1',
    amount: overrides.amount ?? 10,
    type: overrides.type ?? 'expense',
    category: overrides.category ?? 'Groceries',
    date: overrides.date ?? '2026-08-01T12:30:00.000Z',
    title: overrides.title ?? 'Aura Market',
    description: overrides.description ?? ' AURA   MARKET 42! ',
    paymentMethod: overrides.paymentMethod ?? 'Card',
  };
}

describe('description matching', () => {
  it('normalizes NFKC, case and whitespace while preserving digits and punctuation', () => {
    expect(normalizeImportDescription('  ＡＵＲＡ\tMarket  42!  ')).toBe('aura market 42!');
    expect(normalizeImportDescription('Market 42!')).not.toBe(normalizeImportDescription('Market 43!'));
    expect(normalizeImportDescription('Market 42!')).not.toBe(normalizeImportDescription('Market 42'));
  });

  it('keeps amount out of the versioned match key and transaction type inside it', () => {
    expect(createDescriptionMatchKey('Market', 'expense')).toBe(createDescriptionMatchKey(' MARKET ', 'expense'));
    expect(createDescriptionMatchKey('Market', 'expense')).not.toBe(createDescriptionMatchKey('Market', 'income'));
    expect(createDescriptionMatchKey('Market', 'expense')).toMatch(/^description:v1\|expense\|/);
  });

  it('uses a structurally distinct duplicate key containing date and signed cents', () => {
    const matchKey = createDescriptionMatchKey('Market', 'expense');
    const duplicateKey = createDuplicateDetectionKey('2026-08-01', -1_000, 'Market');
    expect(duplicateKey).toMatch(/^duplicate:v1\|2026-08-01\|-1000\|/);
    expect(duplicateKey).not.toBe(matchKey as string);
  });

  it('groups only included rows by normalized description and type', () => {
    const groups = groupPreparedRowsByDescription([
      row({ rowId: 'row-1' }),
      row({ rowId: 'row-2', description: ' AURA  MARKET 42! ' }),
      row({ rowId: 'row-3', type: 'income', signedAmountMinor: 1000 }),
      row({ rowId: 'row-4', included: false }),
    ]);
    expect(groups.map((group) => group.rowIds)).toEqual([
      ['row-1', 'row-2'],
      ['row-3'],
    ]);
  });
});

describe('duplicate detection', () => {
  it('marks every batch collision and matching ledger group without quadratic match arrays', () => {
    const rows = [
      row({ rowId: 'row-1' }),
      row({ rowId: 'row-2', description: ' AURA  MARKET 42! ' }),
      row({ rowId: 'row-3', signedAmountMinor: -1_001 }),
    ];
    const original = structuredClone(rows);
    const result = attachDuplicateMatches(rows, [transaction(), transaction({ id: 'ledger-2' })]);

    expect(result[0]?.duplicateMatches).toEqual([
      { source: 'batch', referenceId: 'row-1', count: 1 },
      { source: 'ledger', referenceId: 'ledger-1', count: 2 },
    ]);
    expect(result[1]?.duplicateMatches).toEqual(result[0]?.duplicateMatches);
    expect(result[2]?.duplicateMatches).toEqual([]);
    expect(rows).toEqual(original);
  });

  it('does not collide when date, signed amount or normalized description differs', () => {
    const rows = [row()];
    const ledger = [
      transaction({ id: 'different-date', date: '2026-08-02T00:00:00.000Z' }),
      transaction({ id: 'different-amount', amount: 10.01 }),
      transaction({ id: 'different-description', description: 'Aura Market 43!' }),
      transaction({ id: 'different-type', type: 'income' }),
    ];
    expect(attachDuplicateMatches(rows, ledger)[0]?.duplicateMatches).toEqual([]);
  });

  it('keeps duplicate metadata bounded for a 20,000-row collision group', () => {
    const rows = Array.from({ length: 20_000 }, (_, index) => row({ rowId: `row-${index}` }));
    const result = attachDuplicateMatches(rows, []);
    expect(result).toHaveLength(20_000);
    expect(result[0]?.duplicateMatches).toEqual([
      { source: 'batch', referenceId: 'row-0', count: 19_999 },
    ]);
    expect(result.every((item) => item.duplicateMatches.length === 1)).toBe(true);
  });
});
