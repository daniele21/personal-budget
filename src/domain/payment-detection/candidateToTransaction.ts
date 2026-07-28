import type { PaymentCandidateReviewDto } from '../../platform/paymentDetection';
import type { Transaction } from '../../types';
import { getLocalDateInputValue } from '../../utils/dates';
import type {
  PaymentCandidateReviewErrors,
  PaymentCandidateReviewForm,
} from './contracts';

const DEFAULT_PAYMENT_METHOD = 'Debit Card';

export function candidateToReviewForm(
  candidate: PaymentCandidateReviewDto,
  categories: string[],
): PaymentCandidateReviewForm {
  return {
    amount: (candidate.amountMinorUnits / 100).toFixed(2),
    title: candidate.merchant?.trim() || 'Card payment',
    category: categories[0] ?? '',
    date: getLocalDateInputValue(new Date(candidate.occurredAtEpochMillis)),
    paymentMethod: DEFAULT_PAYMENT_METHOD,
    reportingClass: undefined,
  };
}

export function validatePaymentCandidateReview(
  form: PaymentCandidateReviewForm,
): PaymentCandidateReviewErrors {
  const errors: PaymentCandidateReviewErrors = {};
  const amount = Number(form.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter an amount greater than 0.';
  }
  if (!form.title.trim()) {
    errors.title = 'Enter a title for this transaction.';
  }
  if (!form.category.trim()) {
    errors.category = 'Select a category.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    errors.date = 'Select a valid date.';
  }
  if (!form.paymentMethod.trim()) {
    errors.paymentMethod = 'Select a payment method.';
  }

  return errors;
}

export function paymentCandidateToTransaction(
  reservedTransactionId: string,
  form: PaymentCandidateReviewForm,
): Transaction {
  const errors = validatePaymentCandidateReview(form);
  if (Object.keys(errors).length > 0) {
    throw new Error('Payment candidate review is incomplete.');
  }

  return {
    id: reservedTransactionId,
    amount: Number(Number(form.amount).toFixed(2)),
    type: 'expense',
    category: form.category.trim(),
    date: new Date(`${form.date}T00:00:00.000Z`).toISOString(),
    title: form.title.trim(),
    description: '',
    paymentMethod: form.paymentMethod.trim(),
    verified: true,
    reportingClass:
      form.reportingClass === 'extra' ? 'extra' : undefined,
    reportingNote: undefined,
  };
}
