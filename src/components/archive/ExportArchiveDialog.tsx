import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, LockKeyhole, X } from 'lucide-react';
import type { AppData } from '../../data/model';
import {
  AURA_ARCHIVE_CRYPTO,
  buildArchiveCounts,
  type ArchiveIssue,
  type AuraArchiveCounts,
} from '../../domain/archive';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  buildPortableArchive,
  type ArchiveBuildPhase,
} from '../../services/archive/archiveBuilder';
import { downloadPortableArchive } from '../../services/archive/archiveDownload';
import { archiveSnapshotService } from '../../services/archive/archiveSnapshotService';
import { Button } from '../ui';

interface ExportArchiveDialogProps {
  isOpen: boolean;
  data: AppData;
  onClose: () => void;
}

const PHASE_LABELS: Record<ArchiveBuildPhase, string> = {
  collecting: 'Collecting local data and receipts…',
  validating: 'Validating the complete workspace…',
  encrypting: 'Encrypting the archive…',
  'self-verifying': 'Reading the file back for verification…',
  complete: 'Archive verified.',
};

export function ExportArchiveDialog({ isOpen, data, onClose }: ExportArchiveDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [encrypted, setEncrypted] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirmation, setPassphraseConfirmation] = useState('');
  const [plaintextAccepted, setPlaintextAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<ArchiveBuildPhase>('collecting');
  const [error, setError] = useState<string | null>(null);
  const [completedFilename, setCompletedFilename] = useState<string | null>(null);
  const [counts, setCounts] = useState<AuraArchiveCounts | null>(null);
  const [snapshotWarnings, setSnapshotWarnings] = useState<ArchiveIssue[]>([]);
  useFocusTrap(dialogRef, isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setCounts(null);
    setSnapshotWarnings([]);
    setError(null);
    void archiveSnapshotService.collect(data).then(
      (snapshot) => {
        if (!active) return;
        setCounts(buildArchiveCounts(snapshot.data, snapshot.preferences, snapshot.attachments));
        setSnapshotWarnings(snapshot.warnings);
      },
      (nextError) => active && setError(nextError instanceof Error ? nextError.message : 'Aura could not inspect local data.'),
    );
    return () => { active = false; };
  }, [data, isOpen]);

  const reset = useCallback(() => {
    setEncrypted(true);
    setPassphrase('');
    setPassphraseConfirmation('');
    setPlaintextAccepted(false);
    setBusy(false);
    setPhase('collecting');
    setError(null);
    setCompletedFilename(null);
    setCounts(null);
    setSnapshotWarnings([]);
  }, []);

  const close = useCallback(() => {
    if (busy) abortRef.current?.abort();
    reset();
    onClose();
  }, [busy, onClose, reset]);

  const passphraseValid = passphrase.length >= AURA_ARCHIVE_CRYPTO.minPassphraseLength &&
    passphrase.length <= AURA_ARCHIVE_CRYPTO.maxPassphraseLength &&
    passphrase === passphraseConfirmation;
  const canExport = Boolean(counts) && snapshotWarnings.length === 0 && !busy && (
    encrypted ? passphraseValid : plaintextAccepted
  );

  const exportArchive = useCallback(async () => {
    if (!canExport) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setCompletedFilename(null);
    try {
      const archive = await buildPortableArchive(data, {
        passphrase: encrypted ? passphrase : undefined,
        signal: controller.signal,
        onProgress: setPhase,
      });
      downloadPortableArchive(archive);
      setCompletedFilename(archive.filename);
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === 'AbortError') return;
      setError(nextError instanceof Error ? nextError.message : 'Aura could not create the archive.');
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }, [canExport, data, encrypted, passphrase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/50 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0" aria-label="Close complete archive export" onClick={close} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-archive-title"
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="export-archive-title" className="font-headline text-lg font-bold text-primary">Export complete Aura archive</h2>
            <p className="mt-1 text-xs text-on-surface-variant">One file for rebuilding this workspace after local data loss.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="rounded-full p-2 hover:bg-surface-container-low">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-2 border-y border-outline-variant/15 py-4 text-sm text-on-surface-variant">
            <p className="font-bold text-on-surface">Included in this file</p>
            <p>Transactions, budgets, recurring items, accounts, categories, goals, reminders, supported preferences, and receipt attachments.</p>
            <p className="text-xs">Login sessions, cloud settings, caches, and identity data are excluded.</p>
            {counts ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-xs sm:grid-cols-4">
                <div><dt>Transactions</dt><dd className="font-bold text-on-surface">{counts.transactions}</dd></div>
                <div><dt>Budgets</dt><dd className="font-bold text-on-surface">{counts.budgets}</dd></div>
                <div><dt>Accounts</dt><dd className="font-bold text-on-surface">{counts.accounts}</dd></div>
                <div><dt>Recurring</dt><dd className="font-bold text-on-surface">{counts.recurring}</dd></div>
                <div><dt>Goals</dt><dd className="font-bold text-on-surface">{counts.savingsGoals}</dd></div>
                <div><dt>Reminders</dt><dd className="font-bold text-on-surface">{counts.customReminders}</dd></div>
                <div><dt>Receipts</dt><dd className="font-bold text-on-surface">{counts.attachments}</dd></div>
              </dl>
            ) : !error && (
              <div role="status" className="flex items-center gap-2 pt-2 text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin" />Counting local data…</div>
            )}
          </div>

          {snapshotWarnings.length > 0 && (
            <div role="alert" className="rounded-xl bg-tertiary/10 p-3 text-sm text-tertiary">Aura cannot create a complete archive until {snapshotWarnings.length} local attachment issue{snapshotWarnings.length === 1 ? '' : 's'} are resolved.</div>
          )}

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-on-surface">Protection</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-container-low p-4">
              <input type="radio" name="archive-protection" checked={encrypted} onChange={() => setEncrypted(true)} />
              <span>
                <span className="flex items-center gap-2 text-sm font-bold text-on-surface"><LockKeyhole className="h-4 w-4" />Passphrase protected</span>
                <span className="mt-1 block text-xs text-on-surface-variant">Recommended. Aura cannot recover a forgotten passphrase.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 ring-inset ring-tertiary/20">
              <input type="radio" name="archive-protection" checked={!encrypted} onChange={() => setEncrypted(false)} />
              <span>
                <span className="flex items-center gap-2 text-sm font-bold text-on-surface"><AlertTriangle className="h-4 w-4 text-tertiary" />No encryption</span>
                <span className="mt-1 block text-xs text-on-surface-variant">Anyone with the file can read its financial data and receipts.</span>
              </span>
            </label>
          </fieldset>

          {encrypted ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold text-on-surface">
                Passphrase
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-low p-3 text-sm"
                />
              </label>
              <label className="space-y-1.5 text-xs font-bold text-on-surface">
                Confirm passphrase
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passphraseConfirmation}
                  onChange={(event) => setPassphraseConfirmation(event.target.value)}
                  className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-low p-3 text-sm"
                />
              </label>
              <p className="text-xs text-on-surface-variant sm:col-span-2">Use at least {AURA_ARCHIVE_CRYPTO.minPassphraseLength} characters. The passphrase is never stored or sent.</p>
            </div>
          ) : (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-tertiary/5 p-3 text-xs text-on-surface">
              <input type="checkbox" checked={plaintextAccepted} onChange={(event) => setPlaintextAccepted(event.target.checked)} />
              <span>I understand that this exported file will contain readable financial data and attachments.</span>
            </label>
          )}

          {busy && <div role="status" className="flex items-center gap-2 text-sm text-on-surface"><Loader2 className="h-4 w-4 animate-spin" />{PHASE_LABELS[phase]}</div>}
          {completedFilename && <div role="status" className="flex items-start gap-2 rounded-xl bg-secondary/10 p-3 text-sm text-on-surface"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /><span><strong>Archive verified and downloaded.</strong><br /><span className="text-xs text-on-surface-variant">{completedFilename}</span></span></div>}
          {error && <div role="alert" className="rounded-xl bg-tertiary/10 p-3 text-sm text-tertiary">{error}</div>}

          <Button fullWidth disabled={!canExport} onClick={() => void exportArchive()}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Creating archive…</> : <><Download className="h-4 w-4" />Create and download archive</>}
          </Button>
          {busy && <Button fullWidth variant="ghost" onClick={() => abortRef.current?.abort()}>Cancel export</Button>}
        </div>
      </div>
    </div>
  );
}
