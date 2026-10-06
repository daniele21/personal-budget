import type { PaymentCandidateReviewDto } from '../../platform/paymentDetection';
import type { Transaction } from '../../types';

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

  const active = new Set(
    activeCategories.filter((category) => category !== 'Uncategorized'),
  );
  const categories = new Map<string, number>();

  for (const transaction of ledger) {
    if (transaction.type !== 'expense') continue;
    if (!transaction.category || transaction.category === 'Uncategorized') continue;
    if (createPaymentMerchantMatchKey(transaction.title) !== candidateKey) continue;

    categories.set(
      transaction.category,
      (categories.get(transaction.category) ?? 0) + 1,
    );
  }

  if (categories.size !== 1) return null;
  const [[category, matchingTransactions]] = categories.entries();
  if (!active.has(category)) return null;

  return { category, matchingTransactions };
}
