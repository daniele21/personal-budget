import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui';
import type { ImportV2MappingOption } from './ImportV2MappingEditor';
import type { ImportV2MappingDraft } from './importV2TaskState';

interface ImportV2MappingReviewProps {
  value: ImportV2MappingDraft;
  dateOptions: readonly ImportV2MappingOption[];
  amountOptions: readonly ImportV2MappingOption[];
  descriptionOptions: readonly ImportV2MappingOption[];
  onContinue: () => void;
  onEdit: () => void;
  onCancel?: () => void;
}

function selectedLabel(options: readonly ImportV2MappingOption[], id: string | null): string {
  return options.find((option) => option.id === id)?.label ?? 'Not detected';
}

export function ImportV2MappingReview({
  value,
  dateOptions,
  amountOptions,
  descriptionOptions,
  onContinue,
  onEdit,
  onCancel,
}: ImportV2MappingReviewProps) {
  const descriptions = value.descriptionColumnIds
    .map((id) => selectedLabel(descriptionOptions, id))
    .join(' + ');

  return (
    <section className="space-y-5" aria-labelledby="import-v2-local-preview-title">
      <div className="space-y-2">
        <p className="text-micro font-bold uppercase tracking-wide text-primary">Check preview</p>
        <h3 id="import-v2-local-preview-title" className="font-headline text-lg font-bold text-on-surface">
          Check what Aura found
        </h3>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          Aura has a complete interpretation for this statement. Check the fields below, then continue or edit them.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-secondary/10 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-on-surface">Mapping ready</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            Nothing has been imported yet. Aura will validate every transaction after you continue.
          </p>
        </div>
      </div>

      <dl className="divide-y divide-outline-variant/10 rounded-2xl bg-surface-container-low px-4">
        <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
          <dt className="text-on-surface-variant">Date</dt>
          <dd className="font-bold text-on-surface">{selectedLabel(dateOptions, value.dateCandidateId)}</dd>
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
          <dt className="text-on-surface-variant">Description</dt>
          <dd className="font-bold text-on-surface">{descriptions || 'Not detected'}</dd>
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-3 py-3 text-sm">
          <dt className="text-on-surface-variant">Money</dt>
          <dd className="font-bold text-on-surface">{selectedLabel(amountOptions, value.amountCandidateId)}</dd>
        </div>
      </dl>

      <div className="flex items-start gap-3 rounded-2xl bg-secondary/10 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Aura applies only deterministic import rules after this point. Review remains mandatory before the final ledger write.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button variant="secondary" onClick={onEdit}>Edit</Button>
        <Button onClick={onContinue}>Continue</Button>
      </div>
    </section>
  );
}
