import { describe, expect, it } from 'vitest';
import type { PaymentCandidateReviewDto } from '../../../platform/paymentDetection';
import type { Transaction } from '../../../types';
import {
  normalizePaymentMerchant,
  suggestPaymentCategory,
} from '../categorySuggestion';

function candidate(
  merchant: string | null = 'Caffè-Shop',
): PaymentCandidateReviewDto {
  return {
    id: 'AbCdEfGhIjKlMnOpQrStUvWx',
    operationType: 'card_payment',
    amountMinorUnits: 1234,
    currency: 'EUR',
    merchant: merchant ?? undefined,
    occurredAtEpochMillis: new Date(2026, 8, 1, 12).getTime(),
    detectedAtEpochMillis: new Date(2026, 8, 1, 12, 1).getTime(),
    matchTier: 'exact',
    status: 'pending',
    expiresAtEpochMillis: new Date(2026, 8, 15).getTime(),
    sourceApp: {
      id: 'aura-synthetic-source',
      displayName: 'Aura controlled test source',
    },
  };
}

function transaction(
  id: string,
  title: string,
  category: string,
  type: 'expense' | 'income' = 'expense',
): Transaction {
  return {
    id,
    amount: 12.34,
    type,
    category,
    date: '2026-08-01',
    title,
    description: '',
    paymentMethod: 'Debit Card',
    verified: true,
  };
}

describe('payment category suggestion', () => {
  it('uses the same conservative merchant normalization shape as native semantic matching', () => {
    expect(normalizePaymentMerchant('  Caffè--SHOP.  ')).toBe('caffe shop');
  });

  it('suggests an active category from consistent matching merchant history', () => {
    const ledger = [
      transaction('tx-1', 'CAFFE shop', 'Dining'),
      transaction('tx-2', 'Caffé.shop!', 'Dining'),
    ];

    expect(suggestPaymentCategory(
      candidate(),
      ledger,
      ['Dining', 'Groceries'],
    )).toEqual({
      category: 'Dining',
      matchingTransactions: 2,
    });
  });

  it('fails closed for conflicting merchant history', () => {
    const ledger = [
      transaction('tx-1', 'Caffe shop', 'Dining'),
      transaction('tx-2', 'Caffe shop', 'Groceries'),
    ];

    expect(suggestPaymentCategory(
      candidate(),
      ledger,
      ['Dining', 'Groceries'],
    )).toBeNull();
  });

  it('ignores inactive categories, income matches, and missing merchants', () => {
    expect(suggestPaymentCategory(
      candidate(),
      [transaction('tx-1', 'Caffe shop', 'Archived')],
      ['Dining'],
    )).toBeNull();

    expect(suggestPaymentCategory(
      candidate(),
      [transaction('tx-1', 'Caffe shop', 'Dining', 'income')],
      ['Dining'],
    )).toBeNull();

    expect(suggestPaymentCategory(
      candidate(null),
      [transaction('tx-1', 'Caffe shop', 'Dining')],
      ['Dining'],
    )).toBeNull();
  });
});
