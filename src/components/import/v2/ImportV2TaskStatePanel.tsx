import React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, PauseCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui';
import type { ImportV2AssistanceFailureReason, ImportV2TaskAction, ImportV2TaskState } from './importV2TaskState';
import { getImportV2TaskActions } from './importV2TaskState';

interface ImportV2TaskStatePanelProps {
  state: ImportV2TaskState;
  onAction?: (action: ImportV2TaskAction) => void;
}

const ASSISTANCE_COPY: Record<ImportV2AssistanceFailureReason, string> = {
  'harnex-unavailable': 'Optional import assistance is not available on this device.',
  'host-missing': 'Optional import assistance is not installed or cannot be reached.',
  unauthorized: 'Optional import assistance is not allowed for this Aura build.',
  'use-case-unready': 'Optional import assistance is not ready for this task.',
  'model-unready': 'Optional import assistance is still preparing.',
  offline: 'You are offline. This file can still be mapped manually on this device.',
};

function ActionButtons({
  actions,
  onAction,
}: {
  actions: readonly ImportV2TaskAction[];
  onAction?: (action: ImportV2TaskAction) => void;
}) {
  if (actions.length === 0 || !onAction) return null;

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {actions.includes('cancel') && (
        <Button variant="ghost" onClick={() => onAction('cancel')}>Cancel</Button>
      )}
      {actions.includes('retry') && (
        <Button variant="secondary" onClick={() => onAction('retry')}>Retry</Button>
      )}
      {actions.includes('continue-manually') && (
        <Button onClick={() => onAction('continue-manually')}>Continue manually</Button>
      )}
      {actions.includes('confirm-mapping') && (
        <Button onClick={() => onAction('confirm-mapping')}>Confirm mapping</Button>
      )}
    </div>
  );
}

export function ImportV2TaskStatePanel({ state, onAction }: ImportV2TaskStatePanelProps) {
  const actions = getImportV2TaskActions(state);

  if (state.kind === 'idle') {
    return (
      <section className="space-y-3" aria-labelledby="import-v2-state-title">
        <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Choose a transaction file</h3>
        <p className="text-sm text-on-surface-variant">Upload a CSV or XLSX file to start understanding its structure.</p>
      </section>
    );
  }

  if (state.kind === 'local-analysis') {
    return (
      <section className="space-y-4" aria-labelledby="import-v2-state-title" aria-busy="true">
        <div className="flex items-start gap-3">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <div>
            <p className="text-micro font-bold uppercase tracking-wide text-primary">Understand file</p>
            <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Reading the file structure</h3>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant" aria-live="polite">
              Aura is checking sheets, headers and sample values on this device. No transaction file is uploaded.
            </p>
          </div>
        </div>
        <ActionButtons actions={actions} onAction={onAction} />
      </section>
    );
  }

  if (state.kind === 'mapping-review') {
    return (
      <section className="space-y-4" aria-labelledby="import-v2-state-title">
        <div className="flex items-start gap-3">
          {state.resolution === 'ambiguous' ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
          )}
          <div>
            <p className="text-micro font-bold uppercase tracking-wide text-primary">Understand file</p>
            <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">
              {state.resolution === 'ambiguous' ? 'Check the file mapping' : 'Mapping ready to review'}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              {state.resolution === 'ambiguous'
                ? 'Aura found more than one possible interpretation. Review and edit the mapping before continuing.'
                : 'Aura has a suggested mapping. Review it before confirming the next step.'}
            </p>
          </div>
        </div>
        <ActionButtons actions={actions} onAction={onAction} />
      </section>
    );
  }

  if (state.kind === 'checking-transactions') {
    return (
      <section className="space-y-4" aria-labelledby="import-v2-state-title" aria-busy="true">
        <div className="flex items-start gap-3">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <div>
            <p className="text-micro font-bold uppercase tracking-wide text-primary">Check transactions</p>
            <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Checking mapped rows</h3>
            <p className="mt-1 text-sm text-on-surface-variant" aria-live="polite">
              Aura is applying the confirmed mapping and validating transaction rows locally.
            </p>
          </div>
        </div>
        <ActionButtons actions={actions} onAction={onAction} />
      </section>
    );
  }

  if (state.kind === 'assistance-unavailable') {
    return (
      <section className="space-y-4" aria-labelledby="import-v2-state-title">
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-tertiary/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
          <div>
            <p className="text-micro font-bold uppercase tracking-wide text-tertiary">
              {state.step === 'understand-file' ? 'Understand file' : 'Categorize'}
            </p>
            <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Continue without assistance</h3>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{ASSISTANCE_COPY[state.reason]}</p>
            <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
              Your import is not blocked. Continue manually now, or retry the optional assistance.
            </p>
          </div>
        </div>
        <ActionButtons actions={actions} onAction={onAction} />
      </section>
    );
  }

  if (state.kind === 'classification-progress') {
    const maximum = Math.max(1, state.total);
    const completed = Math.min(state.completed, maximum);
    const percent = state.total === 0 ? 0 : Math.round((state.completed / state.total) * 100);
    return (
      <section className="space-y-4" aria-labelledby="import-v2-state-title" aria-busy="true">
        <div>
          <p className="text-micro font-bold uppercase tracking-wide text-primary">Categorize</p>
          <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Reviewing category suggestions</h3>
          <p className="mt-1 text-sm text-on-surface-variant" aria-live="polite">
            {state.completed} of {state.total} transaction groups checked ({percent}%).
          </p>
        </div>
        <progress className="h-2 w-full accent-primary" max={maximum} value={completed} aria-label="Category suggestion progress" />
        <p className="text-xs leading-relaxed text-on-surface-variant">
          You can cancel this optional step and continue to Review without waiting for every suggestion.
        </p>
        <ActionButtons actions={actions} onAction={onAction} />
      </section>
    );
  }

  if (state.kind === 'classification-partial-failure') {
    return (
      <section className="space-y-4" aria-labelledby="import-v2-state-title">
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-tertiary/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
          <div>
            <p className="text-micro font-bold uppercase tracking-wide text-tertiary">Categorize</p>
            <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Some suggestions could not be completed</h3>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              {state.completed} of {state.total} groups completed; {state.failed} still need attention. Completed work stays reviewable.
            </p>
          </div>
        </div>
        <ActionButtons actions={actions} onAction={onAction} />
      </section>
    );
  }

  if (state.kind === 'cancelled') {
    return (
      <section className="space-y-4" aria-labelledby="import-v2-state-title">
        <div className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
          <div>
            <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Optional work stopped</h3>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              Nothing has been committed. Continue manually or retry the stopped step.
            </p>
          </div>
        </div>
        <ActionButtons actions={actions} onAction={onAction} />
      </section>
    );
  }

  if (state.kind === 'review') {
    return (
      <section className="space-y-3" aria-labelledby="import-v2-state-title">
        <ShieldCheck className="h-6 w-6 text-secondary" aria-hidden="true" />
        <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Ready for Review</h3>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          Check dates, amounts, descriptions, categories and duplicate warnings before committing any transaction.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="import-v2-state-title" role="status">
      <CheckCircle2 className="h-6 w-6 text-secondary" aria-hidden="true" />
      <h3 id="import-v2-state-title" className="font-headline text-lg font-bold text-on-surface">Import complete</h3>
      <p className="text-sm text-on-surface-variant">{state.importedCount} transactions were added after Review.</p>
    </section>
  );
}
