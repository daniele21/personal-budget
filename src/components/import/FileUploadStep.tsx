/**
 * FileUploadStep — First step of the import wizard.
 *
 * Allows the user to upload an Excel (.xlsx, .xls) or CSV file
 * via drag-and-drop or file picker.
 *
 * Includes a prominent privacy notice informing the user that the
 * file content will be sent to Google Gemini for analysis.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, ShieldAlert, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isSupportedFile, SUPPORTED_EXTENSIONS } from '../../domain/excelParser';

interface FileUploadStepProps {
  onFileSelected: (file: File, forceFresh: boolean) => void;
  isProcessing: boolean;
}

export function FileUploadStep({ onFileSelected, isProcessing }: FileUploadStepProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  /** User must acknowledge the privacy notice before uploading */
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [forceFresh, setForceFresh] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Validate and set the selected file */
  const handleFile = useCallback((file: File) => {
    setError(null);

    if (!isSupportedFile(file.name)) {
      setError(`Unsupported file type. Please upload: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
  }, []);

  /** Start processing only after user explicitly confirms */
  const handleContinue = useCallback(() => {
    if (selectedFile && privacyAccepted) {
      onFileSelected(selectedFile, forceFresh);
    }
  }, [selectedFile, privacyAccepted, onFileSelected, forceFresh]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-headline font-bold text-on-surface text-lg">Import from File</h3>
        <p className="text-sm text-on-surface-variant">
          Upload a bank statement or spreadsheet — AI will extract and categorize your transactions automatically.
        </p>
      </div>

      {/* ── Privacy notice ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-accent-amber/30 bg-accent-amber/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-amber/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 text-accent-amber" />
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">Privacy Notice</p>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
              This feature uses <strong>Google Gemini AI</strong> to analyze your file.
              The content of your spreadsheet will be <strong>sent to Google's servers</strong> for processing.
              Privacy is <strong>not guaranteed</strong> for the data you upload.
              Do not use this feature with files containing sensitive personal information you are not comfortable sharing with Google.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <button
            type="button"
            role="checkbox"
            aria-checked={privacyAccepted}
            onClick={() => setPrivacyAccepted(!privacyAccepted)}
            className={cn(
              'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border',
              privacyAccepted
                ? 'border-primary bg-primary'
                : 'border-outline-variant/40 bg-transparent group-hover:border-primary/50',
            )}
          >
            {privacyAccepted && (
              <svg className="w-3 h-3 text-on-primary" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-xs font-bold text-on-surface">
            I understand and accept that my data will be sent to Google Gemini
          </span>
        </label>
      </div>

      {/* ── Drop zone ──────────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-outline-variant/30 bg-surface-container-low hover:border-primary/50 hover:bg-surface-container-high',
          isProcessing && 'pointer-events-none opacity-60',
        )}
      >
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
          isDragOver ? 'bg-primary/15' : 'bg-surface-container-high',
        )}>
          <Upload className={cn(
            'w-6 h-6 transition-colors',
            isDragOver ? 'text-primary' : 'text-on-surface-variant',
          )} />
        </div>

        {selectedFile ? (
          <div className="text-center">
            <p className="text-sm font-bold text-on-surface">{selectedFile.name}</p>
            <p className="text-micro text-on-surface-variant mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB · Click to change file
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-bold text-on-surface">
              {isDragOver ? 'Drop your file here' : 'Drag & drop your file'}
            </p>
            <p className="text-micro text-on-surface-variant mt-1">
              or click to browse · .xlsx, .xls, .csv
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={handleInputChange}
          disabled={isProcessing}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-tertiary/5 border border-tertiary/20">
          <AlertCircle className="w-4 h-4 text-tertiary flex-shrink-0" />
          <p className="text-sm text-tertiary">{error}</p>
        </div>
      )}

      {/* ── Continue button ────────────────────────────────────── */}
      <div className="pt-2 flex items-center justify-center">
        <label className="flex items-center gap-2 cursor-pointer group">
          <button
            type="button"
            role="checkbox"
            aria-checked={forceFresh}
            onClick={() => setForceFresh(!forceFresh)}
            className={cn(
              'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all border',
              forceFresh
                ? 'border-primary bg-primary'
                : 'border-outline-variant/40 bg-transparent group-hover:border-primary/50',
            )}
          >
            {forceFresh && <Check className="w-3 h-3 text-on-primary" />}
          </button>
          <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">
            Forza ricalcolo AI (Ignora Cache)
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!selectedFile || !privacyAccepted || isProcessing}
        className={cn(
          'w-full py-3.5 rounded-2xl font-headline font-extrabold text-sm transition-all',
          selectedFile && privacyAccepted
            ? 'bg-primary text-on-primary shadow-md shadow-primary/15 active:scale-[0.98]'
            : 'bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed',
        )}
      >
        {isProcessing ? 'Processing...' : 'Analyze with Gemini AI'}
      </button>
    </div>
  );
}
