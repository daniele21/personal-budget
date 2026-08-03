import { describe, expect, it, vi } from 'vitest';
import { INITIAL_APP_DATA, type AppData } from '../../../data/model';
import { calculateImportSummary, createDescriptionMatchKey, type PreparedTransactionImport } from '../../../domain/import';
import type { Transaction } from '../../../types';
import {
  changeTransactionCategories,
  commitTransactionImport,
  undoCommittedImport,
  undoTransactionCategoryChange,
  VerifiedTransactionBulkError,
  type VerifiedBulkTransactionRepository,
} from '../verifiedTransactionBulkService';
import { createImportLedgerFingerprint } from '../prepareTransactionImport';

function transaction(id: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    amount: 12.5,
    type: 'expense',
    category: 'Food',
    date: '2026-08-01T00:00:00.000Z',
    title: `Transaction ${id}`,
    description: `Description ${id}`,
    paymentMethod: 'Card',
    ...overrides,
  };
}

class MemoryRepository implements VerifiedBulkTransactionRepository {
  data: AppData;
  serialized: string | null;
  failSave = false;
  mismatchAfterSave = false;
  failRollback = false;
  savedKeys: string[] = [];

  constructor(data: AppData) {
    this.data = structuredClone(data);
    this.serialized = JSON.stringify(data.transactions);
  }

  loadAppDataStrict(): AppData {
    if (this.mismatchAfterSave && this.savedKeys.length > 0) {
      return { ...structuredClone(this.data), transactions: [] };
    }
    return structuredClone(this.data);
  }

  readSerializedTransactionsStrict(): string | null {
    return this.serialized;
  }

  saveTransactionsStrict(data: AppData): void {
    if (this.failSave) throw new DOMException('quota', 'QuotaExceededError');
    this.savedKeys.push('transactions');
    this.data = structuredClone(data);
    this.serialized = JSON.stringify(data.transactions);
  }

  restoreSerializedTransactionsStrict(serialized: string | null): void {
    if (this.failRollback) throw new Error('rollback failed');
    this.serialized = serialized;
    this.data = {
      ...this.data,
      transactions: serialized === null ? [] : JSON.parse(serialized) as Transaction[],
    };
  }
}

async function preparedFor(ledger: Transaction[]): Promise<PreparedTransactionImport> {
  const description = 'Local market';
  const rows = [{
    rowId: 'import-row-2',
    sourceRowNumber: 2,
    date: '2026-08-02',
    description,
    signedAmountMinor: -2599,
    type: 'expense' as const,
    category: 'Uncategorized',
    categorySource: 'uncategorized' as const,
    included: true,
    selectedForBatch: false,
    descriptionMatchKey: createDescriptionMatchKey(description, 'expense'),
    duplicateMatches: [],
    issues: [],
  }];
  return {
    sourceKind: 'structured-csv',
    preparedAt: '2026-08-03T00:00:00.000Z',
    baseLedgerFingerprint: await createImportLedgerFingerprint(ledger),
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

function dataWith(transactions: Transaction[]): AppData {
  return {
    ...structuredClone(INITIAL_APP_DATA),
    transactions,
    categories: ['Food', 'Travel', 'Uncategorized'],
    archivedCategories: [],
  };
}

describe('verified transaction bulk service', () => {
  it('commits only after exact read-back and returns an ephemeral undo token', async () => {
    const existing = transaction('existing');
    const repository = new MemoryRepository(dataWith([existing]));
    const result = await commitTransactionImport(
      await preparedFor([existing]),
      repository,
      () => 'imported-secure-id',
    );

    expect(repository.savedKeys).toEqual(['transactions']);
    expect(result.data.transactions.map(({ id }) => id)).toEqual(['imported-secure-id', 'existing']);
    expect(result.undoToken.imported[0]).toEqual(result.importedTransactions[0]);
    expect(Object.isFrozen(result.undoToken.imported[0])).toBe(true);
  });

  it('rejects a stale review before writing', async () => {
    const repository = new MemoryRepository(dataWith([transaction('new-ledger-row')]));
    const prepared = await preparedFor([]);

    await expect(commitTransactionImport(prepared, repository, () => 'new-id')).rejects.toMatchObject({
      code: 'ledger_changed',
    });
    expect(repository.savedKeys).toEqual([]);
  });

  it('restores the exact previous transactions value after read-back mismatch', async () => {
    const current = dataWith([transaction('existing')]);
    const repository = new MemoryRepository(current);
    const before = repository.serialized;
    repository.mismatchAfterSave = true;

    await expect(commitTransactionImport(
      await preparedFor(current.transactions),
      repository,
      () => 'new-id',
    )).rejects.toMatchObject({ code: 'read_back_mismatch' });
    expect(repository.serialized).toBe(before);
  });

  it('surfaces rollback failure as a blocking recovery error', async () => {
    const current = dataWith([transaction('existing')]);
    const repository = new MemoryRepository(current);
    repository.failSave = true;
    repository.failRollback = true;

    await expect(commitTransactionImport(
      await preparedFor(current.transactions),
      repository,
      () => 'new-id',
    )).rejects.toEqual(expect.objectContaining({
      code: 'rollback_failed',
      name: 'VerifiedTransactionBulkError',
    } satisfies Partial<VerifiedTransactionBulkError>));
  });

  it('undoes only unchanged imported projections and preserves edited or deleted rows', () => {
    const unchanged = transaction('unchanged');
    const edited = transaction('edited');
    const repository = new MemoryRepository(dataWith([
      unchanged,
      { ...edited, amount: 99 },
      transaction('unrelated'),
    ]));
    const result = undoCommittedImport({ imported: [unchanged, edited, transaction('deleted')] }, repository);

    expect(result.removedIds).toEqual(['unchanged']);
    expect(result.skippedIds).toEqual(['edited', 'deleted']);
    expect(result.data.transactions.map(({ id }) => id)).toEqual(['edited', 'unrelated']);
  });

  it('changes category only and undoes by ID without overwriting unrelated edits', () => {
    const selected = transaction('selected', { attachmentUrl: 'data:image/png;base64,AA', reportingClass: 'extra' });
    const repository = new MemoryRepository(dataWith([selected, transaction('other')]));
    const change = changeTransactionCategories(['selected'], 'Travel', repository);

    expect(change.data.transactions[0]).toEqual({ ...selected, category: 'Travel' });
    repository.data.transactions[1] = { ...repository.data.transactions[1], amount: 88 };
    repository.serialized = JSON.stringify(repository.data.transactions);
    const undone = undoTransactionCategoryChange(change.undoToken, repository);
    expect(undone.data.transactions[0]).toEqual(selected);
    expect(undone.data.transactions[1].amount).toBe(88);
  });

  it('rejects archived or unknown categories without writing', () => {
    const repository = new MemoryRepository({
      ...dataWith([transaction('selected')]),
      archivedCategories: ['Travel'],
    });
    expect(() => changeTransactionCategories(['selected'], 'Travel', repository)).toThrowError(
      expect.objectContaining({ code: 'invalid_category' }),
    );
    expect(repository.savedKeys).toEqual([]);
  });

  it('maps UUID exhaustion to a stable non-sensitive error', async () => {
    const current = dataWith([transaction('collision')]);
    const repository = new MemoryRepository(current);
    const uuidFactory = vi.fn(() => 'collision');
    await expect(commitTransactionImport(
      await preparedFor(current.transactions),
      repository,
      uuidFactory,
    )).rejects.toMatchObject({ code: 'transaction_id_collision' });
    expect(uuidFactory).toHaveBeenCalledTimes(100);
  });
});
