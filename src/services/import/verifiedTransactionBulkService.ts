import type { AppData } from '../../data/model';
import { projectAppData } from '../../data/model';
import { canonicalStringify } from '../../domain/archive';
import { mapPreparedImportRowsToTransactions, type ImportUuidFactory, type PreparedTransactionImport } from '../../domain/import';
import type { Transaction } from '../../types';
import { appDataRepository } from '../../repositories/appDataRepository';
import { createImportLedgerFingerprint } from './prepareTransactionImport';

export interface VerifiedBulkTransactionRepository {
  loadAppDataStrict(): AppData;
  readSerializedTransactionsStrict(): string | null;
  saveTransactionsStrict(data: AppData): void;
  restoreSerializedTransactionsStrict(serialized: string | null): void;
}

export type VerifiedTransactionFailureCode =
  | 'nothing_to_commit'
  | 'blocking_issues'
  | 'ledger_changed'
  | 'transaction_id_collision'
  | 'invalid_category'
  | 'persistence_failed'
  | 'read_back_mismatch'
  | 'rollback_failed';

export class VerifiedTransactionBulkError extends Error {
  constructor(
    readonly code: VerifiedTransactionFailureCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'VerifiedTransactionBulkError';
  }
}

export interface ImportUndoToken {
  imported: ReadonlyArray<Readonly<Transaction>>;
}

export interface CategoryUndoToken {
  previousCategories: ReadonlyArray<Readonly<{ id: string; category: string }>>;
}

export interface VerifiedTransactionMutationResult {
  data: AppData;
}

export interface CommitTransactionImportResult extends VerifiedTransactionMutationResult {
  importedTransactions: Transaction[];
  undoToken: ImportUndoToken;
}

export interface UndoImportResult extends VerifiedTransactionMutationResult {
  removedIds: string[];
  skippedIds: string[];
}

export interface ChangeCategoriesResult extends VerifiedTransactionMutationResult {
  changedIds: string[];
  undoToken: CategoryUndoToken;
}

function transactionProjection(transaction: Transaction): string {
  return canonicalStringify(transaction);
}

function nonTransactionProjection(data: AppData): string {
  const canonical = projectAppData(data);
  return canonicalStringify({
    budgets: canonical.budgets,
    recurring: canonical.recurring,
    accounts: canonical.accounts,
    categories: canonical.categories,
    archivedCategories: canonical.archivedCategories,
    savingsGoals: canonical.savingsGoals,
    monthlyBudget: canonical.monthlyBudget,
  });
}

function transactionsProjection(transactions: readonly Transaction[]): string {
  return canonicalStringify(transactions);
}

function rollback(
  repository: VerifiedBulkTransactionRepository,
  previousSerialized: string | null,
  originalError: unknown,
): never {
  try {
    repository.restoreSerializedTransactionsStrict(previousSerialized);
    if (repository.readSerializedTransactionsStrict() !== previousSerialized) {
      throw new Error('rollback_read_back_mismatch');
    }
  } catch (rollbackError) {
    throw new VerifiedTransactionBulkError(
      'rollback_failed',
      'The previous transaction ledger could not be restored. Reload before continuing.',
      rollbackError,
    );
  }
  if (originalError instanceof VerifiedTransactionBulkError) throw originalError;
  throw new VerifiedTransactionBulkError(
    'persistence_failed',
    'Transactions could not be saved. Your review is still available.',
    originalError,
  );
}

function persistAndVerify(
  current: AppData,
  nextTransactions: Transaction[],
  repository: VerifiedBulkTransactionRepository,
): AppData {
  const previousSerialized = repository.readSerializedTransactionsStrict();
  const nextData = projectAppData({ ...current, transactions: nextTransactions });
  const expectedNonTransactions = nonTransactionProjection(current);
  try {
    repository.saveTransactionsStrict(nextData);
    const persisted = repository.loadAppDataStrict();
    if (
      transactionsProjection(persisted.transactions) !== transactionsProjection(nextData.transactions)
      || nonTransactionProjection(persisted) !== expectedNonTransactions
    ) {
      throw new VerifiedTransactionBulkError(
        'read_back_mismatch',
        'Saved transactions did not match the verified ledger. Your previous ledger was restored.',
      );
    }
    return persisted;
  } catch (error) {
    return rollback(repository, previousSerialized, error);
  }
}

export async function commitTransactionImport(
  prepared: PreparedTransactionImport,
  repository: VerifiedBulkTransactionRepository = appDataRepository,
  uuidFactory?: ImportUuidFactory,
): Promise<CommitTransactionImportResult> {
  if (prepared.issues.some((issue) => issue.severity === 'error')) {
    throw new VerifiedTransactionBulkError('blocking_issues', 'Resolve blocking import errors before saving.');
  }
  if (prepared.summary.includedRows === 0) {
    throw new VerifiedTransactionBulkError('nothing_to_commit', 'Include at least one transaction before importing.');
  }

  const current = repository.loadAppDataStrict();
  if (await createImportLedgerFingerprint(current.transactions) !== prepared.baseLedgerFingerprint) {
    throw new VerifiedTransactionBulkError(
      'ledger_changed',
      'Transaction history changed during review. Reopen the file to refresh duplicate checks.',
    );
  }

  let importedTransactions: Transaction[];
  try {
    importedTransactions = mapPreparedImportRowsToTransactions(
      prepared.rows,
      new Set(current.transactions.map((transaction) => transaction.id)),
      uuidFactory,
    );
  } catch (error) {
    throw new VerifiedTransactionBulkError(
      'transaction_id_collision',
      'Secure transaction IDs could not be reserved. Retry the import.',
      error,
    );
  }
  if (importedTransactions.length === 0) {
    throw new VerifiedTransactionBulkError('nothing_to_commit', 'Include at least one transaction before importing.');
  }

  const data = persistAndVerify(
    current,
    [...importedTransactions, ...current.transactions],
    repository,
  );
  return {
    data,
    importedTransactions,
    undoToken: { imported: importedTransactions.map((transaction) => Object.freeze({ ...transaction })) },
  };
}

export function commitExistingTransactions(
  transactions: readonly Transaction[],
  repository: VerifiedBulkTransactionRepository = appDataRepository,
): CommitTransactionImportResult {
  if (transactions.length === 0) {
    throw new VerifiedTransactionBulkError('nothing_to_commit', 'No valid transactions were found.');
  }
  const current = repository.loadAppDataStrict();
  const occupied = new Set(current.transactions.map((transaction) => transaction.id));
  if (transactions.some((transaction) => occupied.has(transaction.id))) {
    throw new VerifiedTransactionBulkError('transaction_id_collision', 'An imported transaction ID already exists.');
  }
  const importedTransactions = transactions.map((transaction) => ({ ...transaction }));
  const data = persistAndVerify(current, [...importedTransactions, ...current.transactions], repository);
  return {
    data,
    importedTransactions,
    undoToken: { imported: importedTransactions.map((transaction) => Object.freeze({ ...transaction })) },
  };
}

export function undoCommittedImport(
  token: ImportUndoToken,
  repository: VerifiedBulkTransactionRepository = appDataRepository,
): UndoImportResult {
  const current = repository.loadAppDataStrict();
  const expected = new Map(token.imported.map((transaction) => [transaction.id, transactionProjection(transaction)]));
  const removedIds: string[] = [];
  const skippedIds: string[] = [];
  const nextTransactions = current.transactions.filter((transaction) => {
    const projection = expected.get(transaction.id);
    if (projection === undefined) return true;
    if (projection !== transactionProjection(transaction)) {
      skippedIds.push(transaction.id);
      return true;
    }
    removedIds.push(transaction.id);
    return false;
  });
  for (const id of expected.keys()) {
    if (!current.transactions.some((transaction) => transaction.id === id)) skippedIds.push(id);
  }
  const data = removedIds.length === 0
    ? current
    : persistAndVerify(current, nextTransactions, repository);
  return { data, removedIds, skippedIds };
}

export function changeTransactionCategories(
  ids: readonly string[],
  category: string,
  repository: VerifiedBulkTransactionRepository = appDataRepository,
): ChangeCategoriesResult {
  const current = repository.loadAppDataStrict();
  if (!current.categories.includes(category) || current.archivedCategories.includes(category)) {
    throw new VerifiedTransactionBulkError('invalid_category', 'Choose an active category.');
  }
  const selected = new Set(ids);
  const previousCategories: Array<{ id: string; category: string }> = [];
  const nextTransactions = current.transactions.map((transaction) => {
    if (!selected.has(transaction.id) || transaction.category === category) return transaction;
    previousCategories.push({ id: transaction.id, category: transaction.category });
    return { ...transaction, category };
  });
  const data = previousCategories.length === 0
    ? current
    : persistAndVerify(current, nextTransactions, repository);
  return {
    data,
    changedIds: previousCategories.map(({ id }) => id),
    undoToken: { previousCategories },
  };
}

export function undoTransactionCategoryChange(
  token: CategoryUndoToken,
  repository: VerifiedBulkTransactionRepository = appDataRepository,
): VerifiedTransactionMutationResult {
  const current = repository.loadAppDataStrict();
  const previous = new Map(token.previousCategories.map((entry) => [entry.id, entry.category]));
  const nextTransactions = current.transactions.map((transaction) => {
    const category = previous.get(transaction.id);
    return category === undefined ? transaction : { ...transaction, category };
  });
  return { data: persistAndVerify(current, nextTransactions, repository) };
}
