import type { PaymentCandidateReviewDto } from '../../platform/paymentDetection';
import type { Transaction } from '../../types';
import { getLocalDateInputValue } from '../../utils/dates';

const RELATED_CANDIDATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_REPORTED_MATCHES = 5;

export interface RelatedPaymentCandidate {
  id: string;
  merchant?: string;
  sourceAppDisplayName: string;
}

export interface RelatedLedgerTransaction {
  id: string;
  title: string;
  date: string;
}

export interface PaymentDuplicateAssessment {
  relatedCandidates: RelatedPaymentCandidate[];
  ledgerTransactions: RelatedLedgerTransaction[];
  hasPossibleDuplicate: boolean;
}

export const EMPTY_PAYMENT_DUPLICATE_ASSESSMENT: PaymentDuplicateAssessment = {
  relatedCandidates: [],
  ledgerTransactions: [],
  hasPossibleDuplicate: false,
};

function amountMinorUnits(transaction: Transaction): number | null {
  const amount = Math.round(transaction.amount * 100);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function transactionCalendarDate(transaction: Transaction): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(transaction.date);
  return match?.[1] ?? null;
}

export function assessPaymentDuplicates(
  candidate: PaymentCandidateReviewDto | null,
  candidates: PaymentCandidateReviewDto[],
  transactions: Transaction[],
): PaymentDuplicateAssessment {
  if (!candidate) return EMPTY_PAYMENT_DUPLICATE_ASSESSMENT;

  const relatedCandidates = candidates
    .filter((other) => (
      other.id !== candidate.id &&
      other.operationType === candidate.operationType &&
      other.currency === candidate.currency &&
      other.amountMinorUnits === candidate.amountMinorUnits &&
      Math.abs(other.occurredAtEpochMillis - candidate.occurredAtEpochMillis) <=
        RELATED_CANDIDATE_WINDOW_MS
    ))
    .sort((left, right) => (
      Math.abs(left.occurredAtEpochMillis - candidate.occurredAtEpochMillis) -
      Math.abs(right.occurredAtEpochMillis - candidate.occurredAtEpochMillis)
    ))
    .slice(0, MAX_REPORTED_MATCHES)
    .map((other) => ({
      id: other.id,
      ...(other.merchant ? { merchant: other.merchant } : {}),
      sourceAppDisplayName: other.sourceApp.displayName,
    }));

  const candidateDate = getLocalDateInputValue(
    new Date(candidate.occurredAtEpochMillis),
  );
  const ledgerTransactions = transactions
    .filter((transaction) => (
      transaction.type === 'expense' &&
      amountMinorUnits(transaction) === candidate.amountMinorUnits &&
      transactionCalendarDate(transaction) === candidateDate
    ))
    .slice(0, MAX_REPORTED_MATCHES)
    .map((transaction) => ({
      id: transaction.id,
      title: transaction.title,
      date: candidateDate,
    }));

  return {
    relatedCandidates,
    ledgerTransactions,
    hasPossibleDuplicate:
      relatedCandidates.length > 0 || ledgerTransactions.length > 0,
  };
}
