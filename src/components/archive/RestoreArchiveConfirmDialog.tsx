import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, X } from 'lucide-react';
import { AURA_ARCHIVE_CRYPTO, type PreparedRestore } from '../../domain/archive';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { downloadPortableArchive } from '../../services/archive/archiveDownload';
import {
  assessCurrentRestoreImpact,
  restorePreparedArchive,
  type CurrentRestoreImpact,
  type RestorePhase,
} from '../../services/archive/restoreService';
import { Button } from '../ui';

interface RestoreArchiveConfirmDialogProps {
  isOpen: boolean;
  prepared: PreparedRestore;
  archivePassphrase?: string;
  onCancel: () => void;
  onComplete: () => void;
}

const PHASE_LABELS: Record<RestorePhase, string> = {
  preparing: 'Preparing restore protection…',
  'creating-safety-copy': 'Creating and verifying the safety copy…',
  staging: 'Staging the target workspace…',
  committing: 'Replacing local data…',
  verifying: 'Reading all persisted data back…',
  'rolling-back': 'Recovering the previous workspace…',
  complete: 'Restore verified.',
};

export function RestoreArchiveConfirmDialog({
  isOpen,
  prepared,
  archivePassphrase,
  onCancel,
  onComplete,
}: RestoreArchiveConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [impact, setImpact] = useState<CurrentRestoreImpact | null>(null);
  const [safetyPassphrase, setSafetyPassphrase] = useState(archivePassphrase ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [warningsAccepted, setWarningsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<RestorePhase>('preparing');
  const [error, setError] = useState<string | null>(null);
  useFocusTrap(dialogRef, isOpen, onCancel);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setImpact(null);
    setSafetyPassphrase(archivePassphrase ?? '');
    setConfirmed(false);
    setWarningsAccepted(false);
    setError(null);
    void assessCurrentRestoreImpact().then(
      (result) => active && setImpact(result),
      (nextError) => active && setError(nextError instanceof Error ? nextError.message : 'Aura could not inspect the current workspace.'),
    );
    return () => { active = false; };
  }, [archivePassphrase, isOpen]);

  const safetyPassphraseValid = !impact?.hasMeaningfulData || (
    safetyPassphrase.length >= AURA_ARCHIVE_CRYPTO.minPassphraseLength &&
    safetyPassphrase.length <= AURA_ARCHIVE_CRYPTO.maxPassphraseLength
  );
  const warningsReady = prepared.warnings.length === 0 || warningsAccepted;
  const canRestore = Boolean(impact) &&
    !busy &&
    confirmed &&
    warningsReady &&
    safetyPassphraseValid &&
    impact?.canCreateCompleteSafetyCopy !== false;

  const restore = useCallback(async () => {
    if (!canRestore || !impact) return;
    setBusy(true);
    setError(null);
    try {
      await restorePreparedArchive(prepared, {
        acceptWarnings: warningsAccepted,
        confirmReplaceExisting: confirmed,
        safetyCopyPassphrase: impact.hasMeaningfulData ? safetyPassphrase : undefined,
        onSafetyArchiveReady: async (archive) => {
          downloadPortableArchive(archive);
          return true;
        },
        onProgress: setPhase,
      });
      onComplete();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Aura could not restore this archive.');
      setBusy(false);
    }
  }, [canRestore, confirmed, impact, onComplete, prepared, safetyPassphrase, warningsAccepted]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[175] flex items-end justify-center bg-black/55 sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-confirm-title"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="restore-confirm-title" className="font-headline text-lg font-bold text-primary">Replace current Aura data</h2>
            <p className="mt-1 text-xs text-on-surface-variant">This is a complete replacement, not a merge.</p>
          </div>
          <button type="button" disabled={busy} onClick={onCancel} aria-label="Close" className="rounded-full p-2 hover:bg-surface-container-low disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {!impact && !error && <div role="status" className="flex items-center gap-2 text-sm text-on-surface"><Loader2 className="h-4 w-4 animate-spin" />Inspecting current data…</div>}

          {impact?.hasMeaningfulData && (
            <div className="space-y-3 rounded-2xl bg-surface-container-low p-4">
              <div className="flex items-start gap-3">
                <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold text-on-surface">Safety copy required</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Before replacement, Aura will download a verified copy of the workspace currently on this device.</p>
                </div>
              </div>
              {impact.canCreateCompleteSafetyCopy ? (
                <label className="block space-y-1.5 text-xs font-bold text-on-surface">
                  Safety-copy passphrase
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={safetyPassphrase}
                    onChange={(event) => setSafetyPassphrase(event.target.value)}
                    className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-3 text-sm"
                  />
                  <span className="block font-normal text-on-surface-variant">At least {AURA_ARCHIVE_CRYPTO.minPassphraseLength} characters. It may match the imported archive passphrase.</span>
                </label>
              ) : (
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-tertiary/10 p-3 text-xs text-tertiary"><AlertTriangle className="h-4 w-4 shrink-0" />Restore is blocked because the current workspace cannot be captured completely.</div>
              )}
            </div>
          )}

          {prepared.warnings.length > 0 && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-accent-amber/10 p-3 text-xs text-on-surface">
              <input type="checkbox" checked={warningsAccepted} onChange={(event) => setWarningsAccepted(event.target.checked)} />
              <span>I reviewed the {prepared.warnings.length} archive warning{prepared.warnings.length === 1 ? '' : 's'} and want to restore the valid data.</span>
            </label>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-tertiary/20 p-3 text-xs text-on-surface">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I understand that current Aura data and attachments will be replaced. I have access to the imported archive passphrase, if applicable.</span>
          </label>

          {busy && <div role="status" className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm text-on-surface"><Loader2 className="h-4 w-4 animate-spin" />{PHASE_LABELS[phase]}</div>}
          {phase === 'complete' && <div className="flex items-center gap-2 text-sm text-secondary"><CheckCircle2 className="h-4 w-4" />Restore verified.</div>}
          {error && <div role="alert" className="rounded-xl bg-tertiary/10 p-3 text-sm text-tertiary">{error}</div>}

          <Button fullWidth variant="danger" disabled={!canRestore} onClick={() => void restore()}>
            {busy
              ? <><Loader2 className="h-4 w-4 animate-spin" />Restoring and verifying…</>
              : impact?.hasMeaningfulData
                ? 'Download safety copy and replace data'
                : 'Replace with verified archive'}
          </Button>
          <Button fullWidth variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
