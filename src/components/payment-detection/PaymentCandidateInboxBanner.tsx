import React from 'react';
import { BellRing, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { usePaymentDetection } from '../../state/PaymentDetectionProvider';

export function PaymentCandidateInboxBanner() {
  const { candidates, availability } = usePaymentDetection();
  const { pathname } = useLocation();

  if (
    availability !== 'ready' ||
    candidates.length === 0 ||
    pathname === '/payment-detection'
  ) {
    return null;
  }

  return (
    <div className="pb-2">
      <Link
        to="/payment-detection"
        className="flex min-h-12 items-center gap-3 rounded-2xl border border-primary/20 bg-primary/8 px-3.5 py-2.5 text-left shadow-sm shadow-primary/5 transition-all hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:scale-[0.99]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
          <BellRing className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-primary">
            {candidates.length} {candidates.length === 1 ? 'payment' : 'payments'} to review
          </span>
          <span className="block text-xs text-on-surface-variant">
            Confirm, edit, or ignore locally detected payments.
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      </Link>
    </div>
  );
}
