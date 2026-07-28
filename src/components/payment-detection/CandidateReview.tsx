import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Check, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  candidateToReviewForm,
  validatePaymentCandidateReview,
  type PaymentCandidateReviewErrors,
  type PaymentCandidateReviewForm,
} from '../../domain/payment-detection';
import { useApp } from '../../context/AppContext';
import { usePaymentDetection } from '../../state/PaymentDetectionProvider';
import { ReportingTreatmentToggle } from '../ExtraFlagToggle';
import { useToast } from '../Toast';
import { BottomSheet, Button, Input, Select } from '../ui';

const PAYMENT_METHODS = [
  'Debit Card',
  'Credit Card',
  'Cash',
  'Bank Transfer',
];

export function CandidateReview() {
  const navigate = useNavigate();
  const { categories } = useApp();
  const {
    selectedCandidate,
    busyCandidateId,
    selectCandidate,
    confirmCandidate,
    ignoreCandidate,
  } = usePaymentDetection();
  const { toast } = useToast();
  const [form, setForm] = useState<PaymentCandidateReviewForm | null>(null);
  const [errors, setErrors] = useState<PaymentCandidateReviewErrors>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedCandidate) {
      setForm(null);
      setErrors({});
      return;
    }
    setForm(candidateToReviewForm(selectedCandidate, categories));
    setErrors({});
    window.setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [categories, selectedCandidate]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category, label: category })),
    [categories],
  );
  const paymentOptions = useMemo(
    () => PAYMENT_METHODS.map((method) => ({ value: method, label: method })),
    [],
  );

  const update = <K extends keyof PaymentCandidateReviewForm>(
    field: K,
    value: PaymentCandidateReviewForm[K],
  ) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleConfirm = async () => {
    if (!selectedCandidate || !form) return;
    const nextErrors = validatePaymentCandidateReview(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      firstInputRef.current?.focus();
      return;
    }
    try {
      await confirmCandidate(selectedCandidate.id, form);
      toast('Transaction saved and payment candidate cleared.', 'success');
      navigate('/transactions');
    } catch {
      toast('Aura could not finish this payment review.', 'error');
    }
  };

  if (!selectedCandidate || !form) return null;
  const busy = busyCandidateId === selectedCandidate.id;

  return (
    <BottomSheet
      isOpen
      title="Review payment"
      eyebrow="Detected from a notification"
      subtitle={`Source: ${selectedCandidate.sourceApp.displayName}. Check every value before saving.`}
      onClose={() => selectCandidate(null)}
      contentClassName="space-y-4"
      footer={(
        <Button
          fullWidth
          onClick={() => void handleConfirm()}
          disabled={busy}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Saving securely…' : 'Save transaction'}
        </Button>
      )}
    >
      <div className="flex items-start gap-3 rounded-2xl bg-primary/8 p-3">
        <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Aura detected these values locally. No card number, account identifier,
          raw notification text, or confidence score is stored in the transaction.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="detected-payment-amount" className="mb-1 block text-micro font-bold text-on-surface-variant">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">
              €
            </span>
            <input
              ref={firstInputRef}
              id="detected-payment-amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => update('amount', event.target.value)}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? 'detected-payment-amount-error' : undefined}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-2.5 pl-8 pr-3 text-sm font-bold text-on-surface outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {errors.amount && <p id="detected-payment-amount-error" role="alert" className="mt-1 text-xs text-tertiary">{errors.amount}</p>}
        </div>
        <div>
          <Input
            id="detected-payment-date"
            type="date"
            label="Date"
            value={form.date}
            onChange={(event) => update('date', event.target.value)}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? 'detected-payment-date-error' : undefined}
          />
          {errors.date && <p id="detected-payment-date-error" role="alert" className="mt-1 text-xs text-tertiary">{errors.date}</p>}
        </div>
      </div>

      <div>
        <Input
          id="detected-payment-title"
          label="Transaction title"
          value={form.title}
          onChange={(event) => update('title', event.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'detected-payment-title-error' : undefined}
        />
        {errors.title && <p id="detected-payment-title-error" role="alert" className="mt-1 text-xs text-tertiary">{errors.title}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Select
            id="detected-payment-category"
            label="Category"
            value={form.category}
            options={categoryOptions}
            onChange={(event) => update('category', event.target.value)}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? 'detected-payment-category-error' : undefined}
          />
          {errors.category && <p id="detected-payment-category-error" role="alert" className="mt-1 text-xs text-tertiary">{errors.category}</p>}
        </div>
        <Select
          id="detected-payment-method"
          label="Payment method"
          value={form.paymentMethod}
          options={paymentOptions}
          onChange={(event) => update('paymentMethod', event.target.value)}
        />
      </div>

      <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-3">
        <div>
          <p className="text-xs font-bold text-on-surface">Reporting treatment</p>
          <p className="text-micro text-on-surface-variant">
            Leave unselected for a regular expense.
          </p>
        </div>
        <ReportingTreatmentToggle
          type="expense"
          value={form.reportingClass}
          onChange={(value) => update('reportingClass', value)}
        />
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-secondary/20 bg-secondary/5 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Saving creates a normal Aura transaction. The pending native candidate
          is removed only after Aura reads the transaction back successfully.
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void ignoreCandidate(selectedCandidate.id)
            .then(() => toast('Payment ignored.', 'success'))
            .catch(() => toast('The payment could not be ignored.', 'error'));
        }}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-tertiary transition-colors hover:bg-tertiary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary/30 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Ignore without creating a transaction
      </button>
    </BottomSheet>
  );
}
