import { describe, expect, it, vi } from 'vitest';
import { INITIAL_APP_DATA, type AppData } from '../../../data/model';
import type { Transaction } from '../../../types';
import {
  persistTransactionAndVerify,
  VerifiedTransactionError,
} from '../verifiedTransactionService';

const transaction: Transaction = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  amount: 12.34,
  type: 'expense',
  category: 'Groceries',
  date: '2026-07-28T00:00:00.000Z',
  title: 'Local shop',
  description: '',
  paymentMethod: 'Debit Card',
  verified: true,
};

function memoryRepository(initial: AppData = INITIAL_APP_DATA) {
  let stored = structuredClone(initial);
  return {
    loadAppDataStrict: vi.fn(() => structuredClone(stored)),
    saveAppDataStrict: vi.fn((data: AppData) => {
      stored = structuredClone(data);
    }),
  };
}

describe('verified payment transaction persistence', () => {
  it('persists and reads the reserved transaction ID back', () => {
    const repository = memoryRepository();

    persistTransactionAndVerify(transaction, repository);

    expect(repository.saveAppDataStrict).toHaveBeenCalledOnce();
    expect(repository.loadAppDataStrict()).toEqual(
      expect.objectContaining({
        transactions: [transaction],
      }),
    );
  });

  it('fails closed on a reserved transaction ID collision', () => {
    const repository = memoryRepository({
      ...INITIAL_APP_DATA,
      transactions: [{ ...transaction, amount: 999 }],
    });

    expect(() => persistTransactionAndVerify(transaction, repository))
      .toThrowError(expect.objectContaining<Partial<VerifiedTransactionError>>({
        code: 'transaction_id_collision',
      }));
    expect(repository.saveAppDataStrict).not.toHaveBeenCalled();
  });

  it('does not report success when persistence cannot be read back', () => {
    const repository = memoryRepository();
    repository.saveAppDataStrict.mockImplementation(() => undefined);

    expect(() => persistTransactionAndVerify(transaction, repository))
      .toThrowError(expect.objectContaining<Partial<VerifiedTransactionError>>({
        code: 'persistence_verification_failed',
      }));
  });
});
