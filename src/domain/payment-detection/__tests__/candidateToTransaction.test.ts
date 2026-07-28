import { describe, expect, it } from 'vitest';
import type { PaymentCandidateReviewDto } from '../../../platform/paymentDetection';
import {
  candidateToReviewForm,
  paymentCandidateToTransaction,
  validatePaymentCandidateReview,
} from '../candidateToTransaction';

function candidate(
  overrides: Partial<PaymentCandidateReviewDto> = {},
): PaymentCandidateReviewDto {
  return {
    id: 'AbCdEfGhIjKlMnOpQrStUvWx',
    operationType: 'card_payment',
    amountMinorUnits: 1234,
    currency: 'EUR',
    merchant: 'Local shop',
    occurredAtEpochMillis: new Date(2026, 6, 28, 23, 45).getTime(),
    detectedAtEpochMillis: new Date(2026, 6, 28, 23, 46).getTime(),
    matchTier: 'exact',
    status: 'pending',
    expiresAtEpochMillis: new Date(2026, 7, 11).getTime(),
    sourceApp: {
      id: 'aura-synthetic-source',
      displayName: 'Aura controlled test source',
    },
    ...overrides,
  };
}

describe('payment candidate transaction mapping', () => {
  it('uses the device-local calendar day and existing transaction defaults', () => {
    const form = candidateToReviewForm(candidate(), ['Groceries', 'Dining']);

    expect(form).toEqual({
      amount: '12.34',
      title: 'Local shop',
      category: 'Groceries',
      date: '2026-07-28',
      paymentMethod: 'Debit Card',
      reportingClass: undefined,
    });
  });

  it('creates only the canonical transaction shape with the reserved UUID', () => {
    const transaction = paymentCandidateToTransaction(
      '123e4567-e89b-42d3-a456-426614174000',
      {
        amount: '18.95',
        title: 'Edited shop',
        category: 'Dining',
        date: '2026-07-28',
        paymentMethod: 'Credit Card',
        reportingClass: 'extra',
      },
    );

    expect(transaction).toEqual({
      id: '123e4567-e89b-42d3-a456-426614174000',
      amount: 18.95,
      type: 'expense',
      category: 'Dining',
      date: '2026-07-28T00:00:00.000Z',
      title: 'Edited shop',
      description: '',
      paymentMethod: 'Credit Card',
      verified: true,
      reportingClass: 'extra',
      reportingNote: undefined,
    });
    expect(transaction).not.toHaveProperty('candidateId');
    expect(transaction).not.toHaveProperty('sourceApp');
    expect(transaction).not.toHaveProperty('matchTier');
  });

  it('rejects incomplete review values before acceptance begins', () => {
    expect(validatePaymentCandidateReview({
      amount: '0',
      title: ' ',
      category: '',
      date: 'tomorrow',
      paymentMethod: '',
    })).toEqual({
      amount: 'Enter an amount greater than 0.',
      title: 'Enter a title for this transaction.',
      category: 'Select a category.',
      date: 'Select a valid date.',
      paymentMethod: 'Select a payment method.',
    });
  });
});
