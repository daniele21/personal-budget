import type { AppData } from '../../data/model';
import { appDataRepository } from '../../repositories/appDataRepository';
import type { Transaction } from '../../types';

interface VerifiedTransactionRepository {
  loadAppDataStrict(): AppData;
  saveAppDataStrict(data: AppData): void;
}

export class VerifiedTransactionError extends Error {
  constructor(
    readonly code: 'transaction_id_collision' | 'persistence_verification_failed',
    message: string,
  ) {
    super(message);
    this.name = 'VerifiedTransactionError';
  }
}

export function persistTransactionAndVerify(
  transaction: Transaction,
  repository: VerifiedTransactionRepository = appDataRepository,
): void {
  const current = repository.loadAppDataStrict();
  if (current.transactions.some((item) => item.id === transaction.id)) {
    throw new VerifiedTransactionError(
      'transaction_id_collision',
      'The reserved transaction ID already exists.',
    );
  }

  repository.saveAppDataStrict({
    ...current,
    transactions: [transaction, ...current.transactions],
  });
  const persisted = repository.loadAppDataStrict();
  if (!persisted.transactions.some((item) => item.id === transaction.id)) {
    throw new VerifiedTransactionError(
      'persistence_verification_failed',
      'The transaction could not be verified after persistence.',
    );
  }
}
