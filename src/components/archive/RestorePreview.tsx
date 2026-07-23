import React from 'react';
import { AlertTriangle, CheckCircle2, LockKeyhole } from 'lucide-react';
import type { ArchiveRestorePreview } from '../../services/archive/archivePreflightService';
import { Card } from '../ui';

export function RestorePreview({ preview }: { preview: ArchiveRestorePreview }) {
  const rows = [
    ['Transactions', preview.counts.transactions],
    ['Budgets', preview.counts.budgets],
    ['Recurring items', preview.counts.recurring],
    ['Accounts', preview.counts.accounts],
    ['Savings goals', preview.counts.savingsGoals],
    ['Custom reminders', preview.counts.customReminders],
    ['Attachments', preview.counts.attachments],
  ] as const;

  return (
    <div className="space-y-4" aria-live="polite">
      <Card variant="flat" className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
          <CheckCircle2 className="h-4 w-4 text-secondary" />
          Archive ready to restore
        </div>
        <p className="text-xs text-on-surface-variant">
          Created {new Date(preview.createdAt).toLocaleString()} · Aura {preview.sourceAppVersion}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <LockKeyhole className="h-3.5 w-3.5" />
          {preview.encrypted ? 'Passphrase protected' : 'Not encrypted'}
        </div>
      </Card>

      <dl className="grid grid-cols-2 gap-2">
        {rows.map(([label, count]) => (
          <div key={label} className="rounded-xl bg-surface-container-low p-3">
            <dt className="text-micro font-semibold text-on-surface-variant">{label}</dt>
            <dd className="mt-1 text-lg font-extrabold text-on-surface">{count}</dd>
          </div>
        ))}
      </dl>

      {preview.warnings.length > 0 && (
        <div className="rounded-2xl border border-accent-amber/30 bg-accent-amber/5 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <AlertTriangle className="h-4 w-4 text-accent-amber" />
            Restore warnings
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-on-surface-variant">
            {preview.warnings.map((warning) => (
              <li key={`${warning.code}:${warning.path}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
