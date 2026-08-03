import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, ShieldCheck, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  candidateToReviewForm,
  validatePaymentCandidateReview,
  type PaymentCandidateReviewErrors,
  type PaymentCandidateReviewForm,
} from '../../domain/payment-detection';
import { useApp } from '../../context/AppContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { usePaymentDetection } from '../../state/PaymentDetectionProvider';
import { TransactionEditor } from '../transactions/TransactionEditor';
import { useToast } from '../Toast';

export function CandidateReview() {
  const navigate = useNavigate();
  const { categories, addCategory } = useApp();
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
  const dialogRef = useRef<HTMLDivElement>(null);

  const closeReview = () => selectCandidate(null);
  const closeReviewFromEscape = () => {
    const modalDialogs = Array.from(document.querySelectorAll<HTMLElement>(
      '[role="dialog"][aria-modal="true"]',
    ));
    if (modalDialogs.at(-1) !== dialogRef.current) return;
    closeReview();
  };
  useFocusTrap(dialogRef, Boolean(selectedCandidate), closeReviewFromEscape);

  useEffect(() => {
    if (!selectedCandidate) {
      setForm(null);
      setErrors({});
      return;
    }
    setForm(candidateToReviewForm(selectedCandidate, categories));
    setErrors({});
  }, [categories, selectedCandidate]);

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
    if (Object.keys(nextErrors).length > 0) return;

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

  const review = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detected-transaction-review-title"
      className="fixed inset-0 z-[175] overflow-y-auto overscroll-contain bg-surface"
    >
      <header className="sticky top-0 z-30 border-b border-outline-variant/15 bg-surface/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-micro font-bold uppercase tracking-wide text-primary">
              Detected from a notification
            </p>
            <h2
              id="detected-transaction-review-title"
              className="font-headline text-xl font-extrabold text-on-surface"
            >
              Add transaction
            </h2>
            <p className="mt-0.5 truncate text-xs text-on-surface-variant">
              Source: {selectedCandidate.sourceApp.displayName}
            </p>
          </div>
          <button
            type="button"
            onClick={closeReview}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Close detected transaction review"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4">
        <TransactionEditor
          amount={form.amount}
          setAmount={(value) => update('amount', value)}
          type="expense"
          setType={() => undefined}
          typeLocked
          category={form.category}
          setCategory={(value) => update('category', value)}
          title={form.title}
          setTitle={(value) => update('title', value)}
          description=""
          setDescription={() => undefined}
          reportingClass={form.reportingClass}
          setReportingClass={(value) => update('reportingClass', value)}
          date={form.date}
          setDate={(value) => update('date', value)}
          paymentMethod={form.paymentMethod}
          setPaymentMethod={(value) => update('paymentMethod', value)}
          setAttachmentUrl={() => undefined}
          categories={categories}
          onAddCategory={addCategory}
          categorySelectionRequired
          categoryHint="Aura cannot infer the category from this notification. Choose one before saving."
          onSubmit={handleConfirm}
          submitLabel="Save transaction"
          errors={errors}
          clearError={(field) => {
            setErrors((current) => ({ ...current, [field]: undefined }));
          }}
          initialMoreOptionsOpen
          allowNotesAndReceipt={false}
          busy={busy}
          stickyBottomClassName="bottom-0"
          context={(
            <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/8 p-3.5">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-on-surface">
                  Check the prefilled details
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                  Aura detected these values locally. Saving creates a normal
                  transaction without notification text, card data, or a
                  confidence score.
                </p>
              </div>
            </div>
          )}
          secondaryAction={(
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-secondary/20 bg-secondary/5 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  The pending candidate is removed only after Aura verifies the
                  saved transaction.
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
            </div>
          )}
        />
      </main>
    </div>
  );

  return typeof document === 'undefined' ? review : createPortal(review, document.body);
}
