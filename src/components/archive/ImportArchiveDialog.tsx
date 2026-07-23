import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, FileArchive, Loader2, LockKeyhole, X } from 'lucide-react';
import {
  ArchivePassphraseRequiredError,
  type PreparedRestore,
} from '../../domain/archive';
import {
  archivePreflightService,
  type ArchiveRestorePreview,
} from '../../services/archive/archivePreflightService';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Button } from '../ui';
import { RestorePreview } from './RestorePreview';

interface ImportArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrepared: (result: {
    prepared: PreparedRestore;
    file: File;
    passphrase?: string;
  }) => void;
}

function errorMessage(error: unknown): string {
  if (error instanceof ArchivePassphraseRequiredError) return 'Enter the archive passphrase to continue.';
  if (error instanceof Error) return error.message;
  return 'Aura could not inspect this archive.';
}

export function ImportArchiveDialog({ isOpen, onClose, onPrepared }: ImportArchiveDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [preview, setPreview] = useState<ArchiveRestorePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('Choose an Aura archive.');
  const [error, setError] = useState<string | null>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  const reset = useCallback(() => {
    setFile(null);
    setPassphrase('');
    setEncrypted(false);
    setPreview(null);
    setBusy(false);
    setPhase('Choose an Aura archive.');
    setError(null);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const selectFile = useCallback(async (selected: File) => {
    setFile(selected);
    setPreview(null);
    setError(null);
    try {
      const inspection = await archivePreflightService.inspect(selected);
      setEncrypted(inspection.encrypted);
      setPhase(inspection.encrypted ? 'Enter the passphrase to verify this archive.' : 'Archive recognized. Verify it before restore.');
    } catch (nextError) {
      setFile(null);
      setError(errorMessage(nextError));
    }
  }, []);

  const verify = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await archivePreflightService.prepare(file, {
        passphrase: encrypted ? passphrase : undefined,
        onProgress: (nextPhase) => setPhase(
          nextPhase === 'decrypting' ? 'Unlocking archive…' :
            nextPhase === 'validating' ? 'Validating every section…' :
              nextPhase === 'verified' ? 'Archive verified.' : 'Reading archive…',
        ),
      });
      setPreview(result);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }, [encrypted, file, passphrase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/50 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0" aria-label="Close archive import" onClick={close} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-archive-title"
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="import-archive-title" className="font-headline text-lg font-bold text-primary">Import Aura archive</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Checked locally before any data changes.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="rounded-full p-2 hover:bg-surface-container-low">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {!preview && (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-outline-variant/30 bg-surface-container-low p-6 text-center">
              <FileArchive className="h-8 w-8 text-primary" />
              <span className="text-sm font-bold text-on-surface">{file?.name ?? 'Choose .aura file'}</span>
              <input
                type="file"
                accept=".aura,application/vnd.aura.portable-archive"
                className="sr-only"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) void selectFile(selected);
                }}
              />
            </label>
          )}

          {file && encrypted && !preview && (
            <label className="block space-y-1.5">
              <span className="flex items-center gap-2 text-xs font-bold text-on-surface"><LockKeyhole className="h-4 w-4" />Archive passphrase</span>
              <input
                type="password"
                autoComplete="current-password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                className="w-full rounded-xl border border-outline-variant/25 bg-surface-container-low p-3 text-sm"
              />
            </label>
          )}

          {busy && <div className="flex items-center gap-2 text-sm text-on-surface"><Loader2 className="h-4 w-4 animate-spin" />{phase}</div>}
          {error && <div role="alert" className="flex gap-2 rounded-xl bg-tertiary/5 p-3 text-sm text-tertiary"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          {preview && <RestorePreview preview={preview} />}

          {!preview ? (
            <Button fullWidth disabled={!file || busy || (encrypted && !passphrase)} onClick={() => void verify()}>
              Verify archive
            </Button>
          ) : (
            <Button fullWidth onClick={() => onPrepared({ prepared: preview.prepared, file: file!, passphrase: encrypted ? passphrase : undefined })}>
              Continue to replace data
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
