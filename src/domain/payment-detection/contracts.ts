import type { TransactionReportingClass } from '../../types';

export interface PaymentCandidateReviewForm {
  amount: string;
  title: string;
  category: string;
  date: string;
  paymentMethod: string;
  reportingClass?: TransactionReportingClass;
}

export interface PaymentCandidateReviewErrors {
  amount?: string;
  title?: string;
  category?: string;
  date?: string;
  paymentMethod?: string;
}
