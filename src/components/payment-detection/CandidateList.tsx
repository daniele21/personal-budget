import React, { useState } from 'react';
import { BellRing, ChevronRight, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ConfirmDialog } from '../ConfirmDialog';
import { EmptyState } from '../ui';
import { useToast } from '../Toast';
import { usePaymentDetection } from '../../state/PaymentDetectionProvider';
import type { PaymentCandidateReviewDto } from '../../platform/paymentDetection';

function formatAmount(candidate: PaymentCandidateReviewDto): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: candidate.currency,
  }).format(candidate.amountMinorUnits / 100);
}

function formatDate(epochMillis: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epochMillis));
}

export function CandidateList() {
  const {
    candidates,
    busyCandidateId,
    selectCandidate,
    ignoreCandidate,
  } = usePaymentDetection();
  const { toast } = useToast();
  const [candidateToIgnore, setCandidateToIgnore] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <EmptyState
        icon={<BellRing className="h-5 w-5" aria-hidden="true" />}
        title="No payments to review"
        description="Detected payments stay on this device and will appear here until you confirm, edit, or ignore them."
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-outline-variant/20 overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface-container-lowest">
        {candidates.map((candidate, index) => (
          <motion.article
            key={candidate.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 6) * 0.035 }}
            className="group flex items-center gap-3 p-3"
          >
            <button
              type="button"
              onClick={() => selectCandidate(candidate.id)}
              className="min-w-0 flex-1 rounded-2xl p-2 text-left transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={`Review ${candidate.merchant || 'card payment'} for ${formatAmount(candidate)}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-on-surface">
                    {candidate.merchant || 'Card payment'}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                    {formatDate(candidate.occurredAtEpochMillis)} · {candidate.sourceApp.displayName}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-headline text-base font-extrabold tabular-nums text-primary">
                    {formatAmount(candidate)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCandidateToIgnore(candidate.id)}
              disabled={busyCandidateId === candidate.id}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-tertiary/10 hover:text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary/30 disabled:opacity-50"
              aria-label={`Ignore ${candidate.merchant || 'card payment'} without creating a transaction`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.article>
        ))}
      </div>

      <ConfirmDialog
        isOpen={candidateToIgnore !== null}
        title="Ignore this payment?"
        message="Aura will delete the pending details and will not create a transaction. A short-lived local record prevents the same notification from appearing again."
        confirmLabel="Ignore payment"
        cancelLabel="Review instead"
        variant="danger"
        onCancel={() => setCandidateToIgnore(null)}
        onConfirm={() => {
          if (!candidateToIgnore) return;
          void ignoreCandidate(candidateToIgnore)
            .then(() => toast('Payment ignored.', 'success'))
            .catch(() => toast('The payment could not be ignored.', 'error'));
        }}
      />
    </>
  );
}
