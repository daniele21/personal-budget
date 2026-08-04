import { describe, expect, it } from 'vitest';
import type { PaymentCandidateReviewDto } from '../../../platform/paymentDetection';
import type { Transaction } from '../../../types';
import { assessPaymentDuplicates } from '../duplicateAssessment';

const occurredAt = new Date(2026, 7, 4, 12).getTime();

function candidate(
  overrides: Partial<PaymentCandidateReviewDto> = {},
): PaymentCandidateReviewDto {
  return {
    id: 'AbCdEfGhIjKlMnOpQrStUvWx',
    operationType: 'card_payment',
    amountMinorUnits: 1098,
    currency: 'EUR',
    occurredAtEpochMillis: occurredAt,
    detectedAtEpochMillis: occurredAt,
    matchTier: 'review',
    status: 'pending',
    expiresAtEpochMillis: occurredAt + 86_400_000,
    sourceApp: { id: 'paypal', displayName: 'PayPal' },
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    amount: 10.98,
    type: 'expense',
    category: 'Shopping',
    date: '2026-08-04T00:00:00.000Z',
    title: 'Test shop',
    description: '',
    paymentMethod: 'Debit Card',
    ...overrides,
  };
}

describe('payment duplicate assessment', () => {
  it('flags a same-amount candidate from another source within five minutes', () => {
    const selected = candidate();
    const bankCandidate = candidate({
      id: 'ZyXwVuTsRqPoNmLkJiHgFeDc',
      merchant: 'Test shop',
      occurredAtEpochMillis: occurredAt + 120_000,
      sourceApp: { id: 'intesa-sanpaolo-mobile', displayName: 'Intesa Sanpaolo Mobile' },
    });

    const result = assessPaymentDuplicates(selected, [selected, bankCandidate], []);

    expect(result.hasPossibleDuplicate).toBe(true);
    expect(result.relatedCandidates).toEqual([{
      id: bankCandidate.id,
      merchant: 'Test shop',
      sourceAppDisplayName: 'Intesa Sanpaolo Mobile',
    }]);
  });

  it('does not flag different amounts or candidates outside the time window', () => {
    const selected = candidate();
    const differentAmount = candidate({
      id: 'ZyXwVuTsRqPoNmLkJiHgFeDc',
      amountMinorUnits: 1099,
    });
    const later = candidate({
      id: 'QwErTyUiOpAsDfGhJkLzXcVb',
      occurredAtEpochMillis: occurredAt + 5 * 60_000 + 1,
    });

    expect(
      assessPaymentDuplicates(selected, [selected, differentAmount, later], []),
    ).toEqual(expect.objectContaining({
      hasPossibleDuplicate: false,
      relatedCandidates: [],
    }));
  });

  it('flags same-day same-amount ledger expenses without blocking legitimate overrides', () => {
    const result = assessPaymentDuplicates(candidate(), [candidate()], [
      transaction(),
      transaction({ id: 'income', type: 'income' }),
      transaction({ id: 'other-day', date: '2026-08-03T00:00:00.000Z' }),
      transaction({ id: 'other-amount', amount: 11 }),
    ]);

    expect(result.hasPossibleDuplicate).toBe(true);
    expect(result.ledgerTransactions).toEqual([{
      id: 'transaction-1',
      title: 'Test shop',
      date: '2026-08-04',
    }]);
  });
});
