import React, { useCallback, useRef, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react';
import { buildStructuredImportCsvTemplate, buildStructuredImportXlsxTemplate } from '../../data/import';
import type { ImportIssue } from '../../domain/import';
import { isSupportedStructuredImportFile } from '../../data/import';
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

export function FileUploadStep({
  onFileSelected,
  isProcessing,
  validationIssues = [],
  errorMessage,
}: FileUploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          Use the fixed columns <strong>date</strong>, <strong>description</strong>, and <strong>amount</strong>.
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
