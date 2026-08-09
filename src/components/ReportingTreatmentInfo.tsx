import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { BottomSheet } from './ui';

export function ReportingTreatmentInfo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Explain Extra and Refund"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <Info className="h-4 w-4" />
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Extra and Refund"
        subtitle="These labels change how the transaction is interpreted in reports and budgets."
      >
        <div className="space-y-3 pt-1">
          <section className="rounded-2xl border border-accent-amber/20 bg-accent-amber/8 p-4">
            <h4 className="text-sm font-bold text-on-surface">Extra</h4>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Use for an exceptional, non-recurring income or expense. It is included in Actual and Extras only, but excluded from Net of extras. An extra expense affects category budgets only while Actual is selected.
            </p>
          </section>

          <section className="rounded-2xl border border-secondary/20 bg-secondary-container/15 p-4">
            <h4 className="text-sm font-bold text-on-surface">Refund</h4>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Available only for income transactions that repay a previous expense. It stays in Actual and Net, reduces reported expenses and the matching category spend, and is not counted as ordinary income or as an increase to the monthly budget.
            </p>
          </section>

          <p className="px-1 text-xs leading-relaxed text-on-surface-variant">
            Leave both unselected for a regular transaction. Recurring-generated transactions always remain regular.
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
