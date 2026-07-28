import React from 'react';
import { AlertTriangle, BellRing, RefreshCw, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { CandidateList } from '../components/payment-detection/CandidateList';
import { CandidateReview } from '../components/payment-detection/CandidateReview';
import { PaymentDetectionSettings } from '../components/payment-detection/PaymentDetectionSettings';
import { Button, Skeleton } from '../components/ui';
import { usePaymentDetection } from '../state/PaymentDetectionProvider';
import { pageTransition } from '../utils/motion';

export function PaymentDetectionPage() {
  const { availability, candidates, error, refresh } = usePaymentDetection();

  if (availability === 'checking') {
    return (
      <div className="space-y-4 pb-24" role="status" aria-label="Loading payment detection">
        <Skeleton className="h-24" />
        <Skeleton className="h-44" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (availability === 'unsupported') {
    return (
      <motion.div {...pageTransition} className="pb-24">
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Smartphone className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="font-headline text-xl font-extrabold text-primary">
            Available in the Android app
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
            Notification-based payment detection requires Aura’s native Android
            app. The web and PWA versions remain fully usable without it.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className="space-y-6 pb-24">
      <section className="space-y-1 px-1">
        <p className="text-micro font-bold uppercase text-on-surface-variant">
          Local review queue
        </p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-extrabold text-primary">
              Payments to review
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Pending candidates stay outside your ledger until you confirm them.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-extrabold text-primary">
            {candidates.length}
          </span>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-tertiary/20 bg-tertiary/5 p-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-tertiary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-on-surface">Review queue needs attention</p>
            <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} aria-label="Retry payment detection refresh">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      <section aria-labelledby="pending-payments-title" className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 id="pending-payments-title" className="text-sm font-bold text-on-surface">
            Pending
          </h3>
        </div>
        <CandidateList />
      </section>

      <PaymentDetectionSettings />
      <CandidateReview />
    </motion.div>
  );
}
