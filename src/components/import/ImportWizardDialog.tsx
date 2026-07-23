/**
 * ImportWizardDialog — Dialog for importing transactions from Excel/CSV.
 *
 * Simplified 3-step flow:
 * 1. Upload   — user uploads file + accepts privacy notice
 * 2. Processing — Gemini AI extracts and categorizes transactions
 * 3. Review   — user confirms or changes categories, then imports
 *
 * After confirming, a summary is shown before closing.
 *
 * ⚠️ PRIVACY: This feature sends raw spreadsheet data to Google Gemini.
 */
import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useApp } from '../../context/AppContext';
import { useToast } from '../Toast';

// Steps
import { FileUploadStep } from './FileUploadStep';
import { ReviewStep } from './ReviewStep';
import { ImportSummary } from './ImportSummary';

// Domain
import { parseSpreadsheetFile } from '../../domain/excelParser';
import {
  extractAndCategorizeTransactions,
  type CategorizedTransaction,
} from '../../domain/transactionCategorizer';
import type { Transaction } from '../../types';
import { isAuraPortableArchive } from '../../services/archive/archiveReader';

type WizardStep = 'upload' | 'processing' | 'review' | 'summary';

/** Step metadata for the progress indicator */
const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'processing', label: 'AI Analysis' },
  { key: 'review', label: 'Review' },
  { key: 'summary', label: 'Done' },
];

function parseAuraExportRows(rawRows: string[][]): Transaction[] | null {
  const headerIndex = rawRows.findIndex((row) => row.some((cell) => cell.trim() === 'reportingClass'));
  if (headerIndex === -1) return null;

  const headers = rawRows[headerIndex].map((cell) => cell.trim());
  const required = ['amount', 'type', 'category', 'date', 'title', 'description', 'paymentMethod'];
  if (!required.every((key) => headers.includes(key))) return null;

  const indexOf = (key: string) => headers.indexOf(key);
  return rawRows.slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row, index) => {
      const amount = parseFloat(row[indexOf('amount')] ?? '');
      const type = row[indexOf('type')] === 'income' ? 'income' : 'expense';
      const rawReportingClass = row[indexOf('reportingClass')];
      const reportingClass = rawReportingClass === 'extra'
        ? 'extra'
        : type === 'income' && rawReportingClass === 'reimbursement'
          ? 'reimbursement'
          : undefined;
      return {
        id: row[indexOf('id')] || `import_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
        amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
        type,
        category: row[indexOf('category')] || 'Uncategorized',
        date: row[indexOf('date')] || new Date().toISOString(),
        title: row[indexOf('title')] || row[indexOf('description')] || 'Imported transaction',
        description: row[indexOf('description')] || '',
        paymentMethod: row[indexOf('paymentMethod')] || 'Bank Transfer',
        reportingClass,
        reportingNote: reportingClass ? row[indexOf('reportingNote')] || undefined : undefined,
      } satisfies Transaction;
    })
    .filter((transaction) => transaction.amount > 0);
}

interface ImportWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportWizardDialog({ isOpen, onClose }: ImportWizardDialogProps) {
  const { categories, addCategory, addTransactions, user } = useApp();
  const { toast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Wizard state
  const [file, setFile] = useState<File | null>(null);
  const [forceFresh, setForceFresh] = useState(false);
  const [step, setStep] = useState<WizardStep>('upload');
  const [categorizedTxs, setCategorizedTxs] = useState<CategorizedTransaction[]>([]);
  const [importedTxs, setImportedTxs] = useState<Transaction[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Lettura file in corso...');
  const [error, setError] = useState<string | null>(null);

  // Focus trap for accessibility
  useFocusTrap(dialogRef, isOpen, onClose);

  /** Reset all state and close */
  const handleClose = useCallback(() => {
    setStep('upload');
    setFile(null);
    setCategorizedTxs([]);
    setImportedTxs([]);
    setProgress(0);
    setStatusText('Lettura file in corso...');
    setError(null);
    onClose();
  }, [onClose]);

  /** Back navigation — only from review → upload (re-pick file) */
  const canGoBack = step === 'review';
  const handleBack = useCallback(() => {
    if (step === 'review') setStep('upload');
  }, [step]);

  // ── Step 1: File uploaded → parse + send to AI ───────────────────

  const handleFileSelected = useCallback(async (selectedFile: File, force: boolean) => {
    setError(null);
    setFile(selectedFile);
    setForceFresh(force);
    setStep('processing');
    setProgress(0);

    try {
      // Portable archives are private restore artifacts and must never reach
      // spreadsheet parsing or Gemini, even when renamed with a CSV extension.
      if (await isAuraPortableArchive(selectedFile)) {
        throw new Error('Complete Aura archive detected. Use Import Aura archive from Privacy & Backup.');
      }
      // 1. Parse the spreadsheet client-side
      const parsed = await parseSpreadsheetFile(selectedFile);
      const auraExportTransactions = parseAuraExportRows(parsed.rawRows);
      if (auraExportTransactions) {
        addTransactions(auraExportTransactions);
        setImportedTxs(auraExportTransactions);
        setStep('summary');
        toast(`${auraExportTransactions.length} Aura transactions imported!`, 'success');
        return;
      }

      // 2. Send raw data to Gemini for extraction + categorization
      const results = await extractAndCategorizeTransactions(
        parsed.rawRows,
        categories,
        {
          userEmail: user?.email || 'anonymous',
          userId: user?.id || 'anonymous',
          feature: 'transaction-import',
        },
        (p, msg) => {
          setProgress(p);
          setStatusText(msg);
        },
        force
      );

      if (results.length === 0) {
        throw new Error('No transactions found in the file. Please check the file content.');
      }

      setCategorizedTxs(results);
      setStep('review');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze the file.';
      setError(message);
      setStep('upload');
      toast(message, 'error');
    }
  }, [addTransactions, categories, toast, user]);

  // ── Step 3: Review confirmed → Import ─────────────────────────────

  const handleConfirmImport = useCallback(() => {
    const now = new Date();

    const newTransactions: Transaction[] = categorizedTxs
      .filter((ct) => !ct.isDeselected && (ct.amount > 0 || ct.amount < 0))
      .map((ct) => {
        // Parse date or use today
        let dateStr: string;
        if (ct.date) {
          const parsed = new Date(ct.date);
          dateStr = isNaN(parsed.getTime()) ? now.toISOString() : parsed.toISOString();
        } else {
          dateStr = now.toISOString();
        }

        return {
          id: `import_${Date.now()}_${ct.index}_${Math.random().toString(36).slice(2, 7)}`,
          amount: Math.abs(ct.amount),
          type: ct.type,
          category: ct.category,
          date: dateStr,
          title: ct.title || ct.description.slice(0, 50),
          description: ct.description,
          paymentMethod: 'Bank Transfer',
        } satisfies Transaction;
      });

    // Add all transactions to the app in bulk
    addTransactions(newTransactions);

    setImportedTxs(newTransactions);
    setStep('summary');
    toast(`${newTransactions.length} transactions imported!`, 'success');
  }, [categorizedTxs, addTransactions, toast]);

  // ── Step index for progress indicator ─────────────────────────────

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6">
      {/* Backdrop click to close */}
      <button
        type="button"
        className="absolute inset-0"
        onClick={handleClose}
        aria-label="Close import wizard"
      />

      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        role="dialog"
        aria-modal="true"
        aria-label="Import Transactions"
        className="relative z-10 w-full max-w-lg bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl shadow-2xl border border-outline-variant/10 flex flex-col h-[95vh] sm:h-[90vh]"
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                type="button"
                onClick={handleBack}
                className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
              </button>
            )}
            <div>
              <h2 className="font-headline font-bold text-primary text-lg">Import Transactions</h2>
              <p className="text-micro font-bold text-on-surface-variant">
                {STEPS[currentStepIndex]?.label || ''}
                {step !== 'summary' && ` — Step ${currentStepIndex + 1} of ${STEPS.length}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* ── Progress bar ────────────────────────────────────── */}
        <div className="flex gap-1.5 px-5 pt-4 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                'h-1 rounded-full flex-1 transition-all duration-300',
                i <= currentStepIndex ? 'bg-primary' : 'bg-surface-container-high',
              )}
            />
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FileUploadStep
                  onFileSelected={handleFileSelected}
                  isProcessing={false}
                />
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-12 space-y-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-surface-container-high flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  {/* Progress ring overlay */}
                  <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                      className="text-primary transition-all duration-300"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-headline font-bold text-on-surface text-lg">
                    Analyzing with Gemini AI
                  </p>
                  <p className="text-sm text-on-surface-variant mt-1 max-w-[250px] mx-auto min-h-[40px]">
                    {statusText}
                  </p>
                  <p className="text-2xl font-headline font-extrabold text-primary mt-3">
                    {progress}%
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ReviewStep
                  transactions={categorizedTxs}
                  categories={categories}
                  onTransactionsUpdated={setCategorizedTxs}
                  onAddCategory={addCategory}
                />
              </motion.div>
            )}

            {step === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <ImportSummary importedTransactions={importedTxs} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer actions ──────────────────────────────────── */}
        {(step === 'review' || step === 'summary') && (
          <div className="px-5 pb-5 pt-2 border-t border-outline-variant/10 flex-shrink-0">
            {step === 'review' && (
              <button
                type="button"
                onClick={handleConfirmImport}
                className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-headline font-extrabold text-sm shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
              >
                Confirm Import ({categorizedTxs.length} transactions)
              </button>
            )}
            {step === 'summary' && (
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-headline font-extrabold text-sm shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
              >
                Done
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
