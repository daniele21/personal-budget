import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type {
  ImportV2InterpretationFeedbackArea,
  ImportV2InterpretationProposal,
  ImportV2TransformationPlan,
} from '../../../domain/import/v2';
import { formatCurrency } from '../../../utils/formatters';
import { Button } from '../../ui';

interface ImportV2InterpretationReviewProps {
  proposal: ImportV2InterpretationProposal;
  issue?: string | null;
  isBusy?: boolean;
  onConfirm: () => void;
  onRequestRevision: (area: ImportV2InterpretationFeedbackArea) => void;
}

const FEEDBACK_OPTIONS: ReadonlyArray<{
  value: ImportV2InterpretationFeedbackArea;
  label: string;
  description: string;
}> = [
  { value: 'date', label: 'Dates', description: 'The date column or date format is wrong.' },
  { value: 'amount', label: 'Amounts', description: 'Income, expenses, signs, debit or credit are wrong.' },
  { value: 'description', label: 'Descriptions', description: 'Aura is using the wrong text for the transaction.' },
  { value: 'table', label: 'Table or sheet', description: 'Harnex selected the wrong table, sheet or header area.' },
  { value: 'missing-transactions', label: 'Missing transactions', description: 'Some transactions are not represented.' },
  { value: 'row-interpretation', label: 'Some rows', description: 'The overall structure looks right but some rows do not.' },
  { value: 'other', label: 'Start over', description: 'The interpretation is broadly wrong and should be reconsidered.' },
];

function planSummary(plan: ImportV2TransformationPlan): string[] {
  const layout = plan.layout.kind === 'grid'
    ? `Table starts at row ${plan.layout.firstDataRowNumber}`
    : `Records are split with “${plan.layout.delimiter === '\t' ? 'tab' : plan.layout.delimiter}” from source column ${plan.layout.sourceColumnIndex + 1}`;
  const amount = plan.amount.strategy === 'debit-credit'
    ? `Debit column ${plan.amount.debitColumnIndex + 1}, credit column ${plan.amount.creditColumnIndex + 1}`
    : plan.amount.strategy === 'amount-direction'
      ? `Amount column ${plan.amount.amountColumnIndex + 1}, direction column ${plan.amount.directionColumnIndex + 1}`
      : `Amount column ${plan.amount.columnIndex + 1}`;
  return [
    layout,
    `Date column ${plan.date.columnIndex + 1}`,
    `Description column${plan.description.columnIndexes.length === 1 ? '' : 's'} ${plan.description.columnIndexes.map((index) => index + 1).join(', ')}`,
    amount,
  ];
}

export function ImportV2InterpretationReview({
  proposal,
  issue = null,
  isBusy = false,
  onConfirm,
  onRequestRevision,
}: ImportV2InterpretationReviewProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackArea, setFeedbackArea] = useState<ImportV2InterpretationFeedbackArea | null>(null);
  const summary = useMemo(() => planSummary(proposal.plan), [proposal.plan]);

  return (
    <section className="space-y-4" aria-labelledby="import-v2-interpretation-title">
      <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h3 id="import-v2-interpretation-title" className="font-headline text-base font-bold text-on-surface">
              Check what Harnex understood
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              Aura has not applied this interpretation to the whole file yet. Check these examples, then confirm it or tell Harnex what to revisit.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-lowest">
        <div className="border-b border-outline-variant/20 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Preview</p>
        </div>
        <div className="divide-y divide-outline-variant/15">
          {proposal.preview.map((row) => (
            <div key={row.provenance.sourceRowNumber} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">{row.description}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">{row.date}</p>
              </div>
              <p className="self-center text-sm font-bold tabular-nums text-on-surface">
                {formatCurrency(row.signedAmountMinor / 100)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-on-surface">How Aura will read the file</summary>
        <ul className="mt-2 space-y-1 text-xs text-on-surface-variant">
          {summary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </details>

      {proposal.unresolvedSourceRowNumbers.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-tertiary/25 bg-tertiary-container/20 p-4" role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-on-surface">
            {proposal.unresolvedSourceRowNumbers.length} sampled {proposal.unresolvedSourceRowNumbers.length === 1 ? 'row still needs' : 'rows still need'} attention. Confirming the overall structure will not silently import those rows.
          </p>
        </div>
      )}

      {issue && (
        <div className="flex gap-3 rounded-2xl border border-error/25 bg-error/10 p-4" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden="true" />
          <p className="text-sm font-semibold leading-relaxed text-error">{issue}</p>
        </div>
      )}

      {!showFeedback ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" fullWidth disabled={isBusy || Boolean(issue)} onClick={onConfirm}>
            Yes, this is correct
          </Button>
          <Button type="button" variant="secondary" fullWidth disabled={isBusy} onClick={() => setShowFeedback(true)}>
            Something is wrong
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4">
          <fieldset disabled={isBusy}>
            <legend className="text-sm font-bold text-on-surface">What should Harnex revisit?</legend>
            <div className="mt-3 grid gap-2">
              {FEEDBACK_OPTIONS.map((option) => (
                <label key={option.value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-outline-variant/20 px-3 py-2.5 has-[:checked]:border-primary/45 has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name="import-v2-feedback"
                    value={option.value}
                    checked={feedbackArea === option.value}
                    onChange={() => setFeedbackArea(option.value)}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-on-surface">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-on-surface-variant">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={isBusy} onClick={() => { setShowFeedback(false); setFeedbackArea(null); }}>
              Back
            </Button>
            <Button
              type="button"
              disabled={isBusy || feedbackArea == null}
              onClick={() => { if (feedbackArea) onRequestRevision(feedbackArea); }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Ask Harnex to revise
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
