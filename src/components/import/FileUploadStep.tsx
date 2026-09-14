import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { buildStructuredImportCsvTemplate, buildStructuredImportXlsxTemplate } from '../../data/import';
import type { ImportIssue } from '../../domain/import';
import { isSupportedStructuredImportFile } from '../../data/import';
import { harnexClient, openHarnexHostApp, type HarnexFailure } from '../../platform/harnex';
import { getPlatformCapabilities } from '../../platform/platformCapabilities';
import { downloadBlob } from '../../services/archive/archiveDownload';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { ValidationSummary } from './ValidationSummary';

interface FileUploadStepProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  validationIssues?: ImportIssue[];
  errorMessage?: string | null;
}

type HarnexReadiness =
  | { kind: 'checking' }
  | { kind: 'ready' }
  | { kind: 'approval-required' }
  | { kind: 'host-missing' }
  | { kind: 'incompatible' }
  | { kind: 'unavailable'; detail: string };

function readinessFromFailure(failure: HarnexFailure): HarnexReadiness {
  switch (failure.code) {
    case 'UNAUTHORIZED':
      return { kind: 'approval-required' };
    case 'HOST_NOT_INSTALLED':
      return { kind: 'host-missing' };
    case 'INCOMPATIBLE':
      return { kind: 'incompatible' };
    case 'CONNECTION_TIMEOUT':
      return { kind: 'unavailable', detail: 'Harnex did not respond in time.' };
    case 'CONNECTION_LOST':
      return { kind: 'unavailable', detail: 'The connection to Harnex was interrupted.' };
    default:
      return { kind: 'unavailable', detail: 'Harnex cannot be reached right now.' };
  }
}

function HarnexReadinessPanel({
  state,
  onOpenHarnex,
  onRefresh,
}: {
  state: HarnexReadiness;
  onOpenHarnex: () => void;
  onRefresh: () => void;
}) {
  if (state.kind === 'checking') {
    return (
      <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
        <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-on-surface">Checking on-device assistance</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Aura is checking whether Harnex can accept this app identity.</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'ready') {
    return (
      <div role="status" aria-live="polite" className="space-y-3 rounded-2xl bg-secondary/10 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-on-surface">Harnex assistance ready</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Aura can reach Harnex and this app identity is authorized. Task and model readiness are checked only when assistance is actually needed.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Check again
        </Button>
      </div>
    );
  }

  const content = state.kind === 'approval-required'
    ? {
        title: 'Harnex approval required',
        detail: 'This Aura build is blocked until its exact app identity is approved in Harnex. Open Harnex, review the package and signing identity, then allow Aura. This status refreshes when you return.',
        canOpen: true,
      }
    : state.kind === 'host-missing'
      ? {
          title: 'Harnex not installed',
          detail: 'Optional on-device assistance is not installed. You can still import transactions manually.',
          canOpen: false,
        }
      : state.kind === 'incompatible'
        ? {
            title: 'Harnex update required',
            detail: 'Aura found Harnex, but the installed versions cannot use the same consumer protocol. Update the apps before retrying assistance.',
            canOpen: true,
          }
        : {
            title: 'Harnex unavailable',
            detail: `${state.detail} Manual import remains available.`,
            canOpen: true,
          };

  return (
    <div role="alert" className="space-y-3 rounded-2xl bg-tertiary/10 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-on-surface">{content.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{content.detail}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {content.canOpen && (
          <Button size="sm" onClick={onOpenHarnex}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open Harnex
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Check again
        </Button>
      </div>
    </div>
  );
}

export function FileUploadStep({
  onFileSelected,
  isProcessing,
  validationIssues = [],
  errorMessage,
}: FileUploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const harnexSupported = getPlatformCapabilities().harnexSupported;
  const [harnexReadiness, setHarnexReadiness] = useState<HarnexReadiness | null>(
    harnexSupported ? { kind: 'checking' } : null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const readinessRevisionRef = useRef(0);

  const checkHarnexReadiness = useCallback(async () => {
    if (!harnexSupported) return;
    const revision = ++readinessRevisionRef.current;
    setHarnexReadiness({ kind: 'checking' });
    try {
      const result = await harnexClient.connect();
      if (revision !== readinessRevisionRef.current) return;
      if (result.status === 'connected') {
        setHarnexReadiness({ kind: 'ready' });
        void harnexClient.disconnect().catch(() => undefined);
      } else {
        setHarnexReadiness(readinessFromFailure(result.failure));
      }
    } catch {
      if (revision === readinessRevisionRef.current) {
        setHarnexReadiness({ kind: 'unavailable', detail: 'Harnex cannot be reached right now.' });
      }
    }
  }, [harnexSupported]);

  useEffect(() => {
    if (!harnexSupported) return undefined;
    void checkHarnexReadiness();
    const refreshOnFocus = () => void checkHarnexReadiness();
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') void checkHarnexReadiness();
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);
    return () => {
      readinessRevisionRef.current += 1;
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [checkHarnexReadiness, harnexSupported]);

  const openHarnex = useCallback(async () => {
    try {
      const result = await openHarnexHostApp();
      if (result.status === 'unavailable') setHarnexReadiness(readinessFromFailure(result.failure));
    } catch {
      setHarnexReadiness({ kind: 'unavailable', detail: 'Harnex could not be opened.' });
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (!isSupportedStructuredImportFile(file.name)) {
      setSelectedFile(null);
      setError('Use a CSV or XLSX file.');
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const downloadCsvTemplate = useCallback(() => {
    downloadBlob(buildStructuredImportCsvTemplate(), 'aura_transaction_import_template.csv');
  }, []);

  const downloadXlsxTemplate = useCallback(async () => {
    downloadBlob(await buildStructuredImportXlsxTemplate(), 'aura_transaction_import_template.xlsx');
  }, []);

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <FileSpreadsheet className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h3 className="font-headline text-lg font-bold text-on-surface">Import transactions</h3>
        <p className="mx-auto max-w-sm text-sm text-on-surface-variant">
          Choose a CSV or XLSX bank export. Aura can understand common or custom column names and asks you to review uncertain mappings before import.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-secondary/10 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-on-surface">Processed only on this device</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface">
            Aura does not upload the file. CSV supports up to 10 MiB; XLSX supports up to 5 MiB and the first worksheet only.
          </p>
        </div>
      </div>

      {harnexSupported && harnexReadiness && (
        <div className="space-y-2" aria-label="On-device import assistance">
          <HarnexReadinessPanel
            state={harnexReadiness}
            onOpenHarnex={() => void openHarnex()}
            onRefresh={() => void checkHarnexReadiness()}
          />
          <p className="px-1 text-xs leading-relaxed text-on-surface-variant">
            File structure and Harnex connection are separate checks. Aura first builds safe parsing candidates locally; Harnex can only choose among those candidates. A file-structure error can therefore appear even when Harnex is connected.
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2" aria-label="Import templates">
        <Button variant="secondary" size="sm" className="min-h-11" onClick={downloadCsvTemplate}>
          <Download className="h-4 w-4" aria-hidden="true" />
          CSV template
        </Button>
        <Button variant="secondary" size="sm" className="min-h-11" onClick={() => void downloadXlsxTemplate()}>
          <Download className="h-4 w-4" aria-hidden="true" />
          XLSX template
        </Button>
      </div>

      {validationIssues.length > 0 && <ValidationSummary issues={validationIssues} />}
      {errorMessage && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl bg-tertiary/10 px-4 py-3 text-tertiary">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={handleDrop}
        className={cn(
          'relative flex min-h-44 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-all',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant/30 bg-surface-container-low hover:border-primary/50',
          isProcessing && 'pointer-events-none opacity-60',
        )}
      >
        <Upload className="h-7 w-7 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-on-surface">
            {selectedFile ? selectedFile.name : 'Drop a file here'}
          </p>
          <p className="mt-1 text-micro text-on-surface-variant">
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(1)} KiB · choose another file if needed`
              : 'or choose a CSV or XLSX file'}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
        >
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
          disabled={isProcessing}
          aria-label="Choose transaction file"
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl bg-tertiary/10 px-4 py-3 text-tertiary">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Button
        fullWidth
        onClick={() => selectedFile && onFileSelected(selectedFile)}
        disabled={!selectedFile || isProcessing}
      >
        {isProcessing ? 'Validating file…' : 'Validate file'}
      </Button>
      <p className="text-center text-micro text-on-surface-variant">
        CSV and XLSX import transactions only. Use an Aura archive to restore a complete backup.
      </p>
    </div>
  );
}
