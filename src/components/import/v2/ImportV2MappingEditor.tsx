import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button, Select } from '../../ui';
import type { ImportV2MappingDraft } from './importV2TaskState';
import { isImportV2MappingComplete } from './importV2TaskState';

export interface ImportV2MappingOption {
  id: string;
  label: string;
  detail?: string;
}

interface ImportV2MappingEditorProps {
  resolution: 'resolved' | 'ambiguous';
  value: ImportV2MappingDraft;
  dateOptions: readonly ImportV2MappingOption[];
  amountOptions: readonly ImportV2MappingOption[];
  descriptionOptions: readonly ImportV2MappingOption[];
  typeOptions?: readonly ImportV2MappingOption[];
  issues?: readonly string[];
  onChange: (next: ImportV2MappingDraft) => void;
  onConfirm: () => void;
  onCancel?: () => void;
}

function optionLabel(option: ImportV2MappingOption): string {
  return option.detail ? `${option.label} · ${option.detail}` : option.label;
}

export function ImportV2MappingEditor({
  resolution,
  value,
  dateOptions,
  amountOptions,
  descriptionOptions,
  typeOptions = [],
  issues = [],
  onChange,
  onConfirm,
  onCancel,
}: ImportV2MappingEditorProps) {
  const complete = isImportV2MappingComplete(value);

  const update = (patch: Partial<ImportV2MappingDraft>) => {
    onChange({ ...value, ...patch });
  };

  const toggleDescription = (columnId: string) => {
    const selected = value.descriptionColumnIds.includes(columnId);
    update({
      descriptionColumnIds: selected
        ? value.descriptionColumnIds.filter(id => id !== columnId)
        : [...value.descriptionColumnIds, columnId],
    });
  };

  return (
    <section className="space-y-5" aria-labelledby="import-v2-mapping-title">
      <div className="space-y-2">
        <p className="text-micro font-bold uppercase tracking-wide text-primary">Understand file</p>
        <h3 id="import-v2-mapping-title" className="font-headline text-lg font-bold text-on-surface">
          Check the columns Aura should use
        </h3>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          Review the detected columns before continuing. You can change every choice, and no transaction is added yet.
        </p>
      </div>

      {resolution === 'ambiguous' ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-tertiary/10 p-4 text-on-surface">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold">Aura needs your confirmation</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              The file can be interpreted in more than one way. Choose the columns that match your statement.
            </p>
            {issues.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-on-surface-variant">
                {issues.map(issue => <li key={issue}>{issue}</li>)}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl bg-secondary/10 p-4 text-on-surface">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold">Suggested mapping ready</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Check the suggestion before confirming it. Aura will not apply the mapping silently.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Transaction date"
          value={value.dateCandidateId ?? ''}
          onChange={event => update({ dateCandidateId: event.target.value || null })}
          options={[
            { value: '', label: 'Choose a date column' },
            ...dateOptions.map(option => ({ value: option.id, label: optionLabel(option) })),
          ]}
        />
        <Select
          label="Amount"
          value={value.amountCandidateId ?? ''}
          onChange={event => update({ amountCandidateId: event.target.value || null })}
          options={[
            { value: '', label: 'Choose an amount interpretation' },
            ...amountOptions.map(option => ({ value: option.id, label: optionLabel(option) })),
          ]}
        />
      </div>

      <fieldset className="space-y-2 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
        <legend className="px-1 text-micro font-bold text-on-surface-variant">Description columns</legend>
        <p className="text-xs text-on-surface-variant">Select one or more columns to build the transaction description.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {descriptionOptions.map(option => (
            <label key={option.id} className="flex min-h-11 items-start gap-3 rounded-xl px-2 py-2 text-sm text-on-surface hover:bg-surface-container-low">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                checked={value.descriptionColumnIds.includes(option.id)}
                onChange={() => toggleDescription(option.id)}
              />
              <span>
                <span className="block font-bold">{option.label}</span>
                {option.detail && <span className="block text-micro text-on-surface-variant">{option.detail}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Select
        label="Transaction type (optional)"
        value={value.typeColumnId ?? ''}
        onChange={event => update({ typeColumnId: event.target.value || null })}
        options={[
          { value: '', label: 'Infer from the selected amount rule' },
          ...typeOptions.map(option => ({ value: option.id, label: optionLabel(option) })),
        ]}
      />

      <div className="flex items-start gap-3 rounded-2xl bg-secondary/10 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-on-surface-variant">
          File structure and mapping stay on this device. The confirmed mapping is used by Aura's deterministic import checks before Review.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={onConfirm} disabled={!complete}>
          Confirm mapping
        </Button>
      </div>
    </section>
  );
}
