import type { PaymentCandidateReviewDto } from '../../platform/paymentDetection';
import type { Transaction } from '../../types';
import {
  buildActiveCategorySet,
  buildCategoryHistoryIndex,
  resolveUnambiguousHistoricalCategory,
} from '../categoryHistory';

const PAYMENT_MERCHANT_MATCH_KEY_VERSION = 'v1' as const;

export interface PaymentCategorySuggestion {
  category: string;
  matchingTransactions: number;
}

export function normalizePaymentMerchant(merchant: string): string {
  return merchant
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function createPaymentMerchantMatchKey(merchant: string): string | null {
  const normalized = normalizePaymentMerchant(merchant);
  return normalized
    ? `payment-merchant:${PAYMENT_MERCHANT_MATCH_KEY_VERSION}|expense|${normalized}`
    : null;
}

export function suggestPaymentCategory(
  candidate: PaymentCandidateReviewDto,
  ledger: readonly Transaction[],
  activeCategories: readonly string[],
): PaymentCategorySuggestion | null {
  const candidateKey = candidate.merchant
    ? createPaymentMerchantMatchKey(candidate.merchant)
    : null;
  if (!candidateKey) return null;

  const history = buildCategoryHistoryIndex(ledger, (transaction) => {
    if (transaction.type !== 'expense') return null;
    return createPaymentMerchantMatchKey(transaction.title);
  });
  const suggestion = resolveUnambiguousHistoricalCategory(
    history,
    candidateKey,
    buildActiveCategorySet(activeCategories),
  );

  return suggestion
    ? {
        category: suggestion.category,
        matchingTransactions: suggestion.matchCount,
      }
    : null;
}
