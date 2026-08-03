import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, Loader2, ShieldCheck, X } from 'lucide-react';
import type { ImportIssue, ImportSummary as ImportReviewSummary, PreparedTransactionImport } from '../../domain/import';
import { readTransactionImportFile, prepareTransactionImport } from '../../services/import';
import type { Transaction } from '../../types';
import { useApp } from '../../context/AppContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { ConfirmDialog } from '../ConfirmDialog';
import { useToast } from '../Toast';
import { FileUploadStep } from './FileUploadStep';
import { ImportSummary } from './ImportSummary';
import { ReviewStep } from './ReviewStep';

type WizardStep = 'upload' | 'validating' | 'review' | 'confirm' | 'summary';

const STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: 'upload', label: 'Upload' },
  { key: 'validating', label: 'Validate' },
  { key: 'review', label: 'Categorize' },
  { key: 'confirm', label: 'Review and import' },
  { key: 'summary', label: 'Done' },
];

interface ImportWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onViewUncategorized?: () => void;
}

function emptySummary(count: number): ImportReviewSummary {
  return {
    totalRows: count,
    includedRows: count,
    excludedRows: 0,
    incomeMinor: 0,
    expenseMinor: 0,
    netMinor: 0,
    uncategorizedRows: 0,
    warningRows: 0,
    possibleDuplicateRows: 0,
  };
}

function secureLegacyId(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('Secure transaction IDs are unavailable.');
  return globalThis.crypto.randomUUID();
}

function parseAuraExportRows(rawRows: string[][]): Transaction[] {
  const headerIndex = rawRows.findIndex((row) => row.some((cell) => cell.trim() === 'reportingClass'));
  if (headerIndex < 0) return [];
  const headers = rawRows[headerIndex].map((cell) => cell.trim());
  const indexOf = (key: string) => headers.indexOf(key);
  return rawRows.slice(headerIndex + 1).flatMap((row) => {
    const amount = Number(row[indexOf('amount')] ?? '');
    if (!Number.isFinite(amount) || amount <= 0) return [];
    const type = row[indexOf('type')] === 'income' ? 'income' : 'expense';
    const rawReportingClass = row[indexOf('reportingClass')];
    const reportingClass = rawReportingClass === 'extra'
      ? 'extra'
      : type === 'income' && rawReportingClass === 'reimbursement'
        ? 'reimbursement'
        : undefined;
    return [{
      id: row[indexOf('id')] || secureLegacyId(),
      amount,
      type,
      category: row[indexOf('category')] || 'Uncategorized',
      date: row[indexOf('date')],
      title: row[indexOf('title')] || row[indexOf('description')] || 'Imported transaction',
      description: row[indexOf('description')] || '',
      paymentMethod: row[indexOf('paymentMethod')] || 'Bank Transfer',
      reportingClass,
      reportingNote: reportingClass ? row[indexOf('reportingNote')] || undefined : undefined,
    } satisfies Transaction];
  });
}

export function ImportWizardDialog({ isOpen, onClose, onViewUncategorized }: ImportWizardDialogProps) {
  const {
    categories,
    addCategory,
    transactions,
    commitPreparedTransactionImport,
    commitExistingTransactionImport,
    undoTransactionImport,
  } = useApp();
  const { toast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<WizardStep>('upload');
  const [prepared, setPrepared] = useState<PreparedTransactionImport | null>(null);
  const [validationIssues, setValidationIssues] = useState<ImportIssue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importedTransactions, setImportedTransactions] = useState<Transaction[]>([]);
  const [completedSummary, setCompletedSummary] = useState<ImportReviewSummary>(emptySummary(0));
  const [duplicatesKept, setDuplicatesKept] = useState(0);
  const [discardAction, setDiscardAction] = useState<'close' | 'upload' | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const reset = useCallback(() => {
    setStep('upload');
    setPrepared(null);
    setValidationIssues([]);
    setErrorMessage(null);
    setImportedTransactions([]);
    setCompletedSummary(emptySummary(0));
    setDuplicatesKept(0);
    setIsCommitting(false);
  }, []);

  const closeImmediately = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const requestClose = useCallback(() => {
    if (prepared && step !== 'summary') setDiscardAction('close');
    else closeImmediately();
  }, [closeImmediately, prepared, step]);

  useFocusTrap(dialogRef, isOpen, requestClose);

  const handleFileSelected = useCallback(async (file: File) => {
    setStep('validating');
    setValidationIssues([]);
    setErrorMessage(null);
    try {
      const result = await readTransactionImportFile(file);
      if (result.kind === 'aura-archive') {
        setErrorMessage('Complete Aura archive detected. Use Import Aura archive in Data & Privacy.');
        setStep('upload');
        return;
      }
      if (result.kind === 'rejected') {
        setValidationIssues(result.issues);
        setStep('upload');
        return;
      }
      if (result.kind === 'aura-legacy-csv') {
        const legacyTransactions = parseAuraExportRows(result.rawRows);
        if (legacyTransactions.length === 0) throw new Error('The Aura transaction CSV does not contain valid rows.');
        const commitResult = await commitExistingTransactionImport(legacyTransactions);
        setImportedTransactions(commitResult.importedTransactions);
        setCompletedSummary(emptySummary(legacyTransactions.length));
        setStep('summary');
        toast(`${legacyTransactions.length} Aura transactions imported.`, 'success', 10000, {
          label: 'Undo import',
          onClick: async () => {
            const undo = await undoTransactionImport(commitResult.undoToken);
            toast(
              undo.skippedIds.length > 0
                ? `${undo.removedIds.length} removed; ${undo.skippedIds.length} changed or missing transactions kept.`
                : `${undo.removedIds.length} imported transactions removed.`,
              'info',
            );
          },
        });
        return;
      }
      if (result.validation.hasBlockingIssues) {
        setValidationIssues(result.validation.issues);
        setStep('upload');
        return;
      }
      const nextPrepared = await prepareTransactionImport(result.validation, transactions);
      if (nextPrepared.rows.length === 0) throw new Error('The file does not contain valid transaction rows.');
      setPrepared(nextPrepared);
      setStep('review');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The file could not be validated.';
      setErrorMessage(message);
      setStep('upload');
      toast(message, 'error');
    }
  }, [commitExistingTransactionImport, prepareTransactionImport, toast, transactions, undoTransactionImport]);

  const handleBack = () => {
    if (step === 'confirm') setStep('review');
    else if (step === 'review') setDiscardAction('upload');
  };

  const handleImport = async () => {
    if (!prepared) return;
    setIsCommitting(true);
    setErrorMessage(null);
    try {
      const result = await commitPreparedTransactionImport(prepared);
      setImportedTransactions(result.importedTransactions);
      setCompletedSummary(prepared.summary);
      setDuplicatesKept(prepared.rows.filter((row) => row.included && row.duplicateMatches.length > 0).length);
      setStep('summary');
      toast(`${result.importedTransactions.length} transactions imported.`, 'success', 10000, {
        label: 'Undo import',
        onClick: async () => {
          try {
            const undo = await undoTransactionImport(result.undoToken);
            toast(
              undo.skippedIds.length > 0
                ? `${undo.removedIds.length} removed; ${undo.skippedIds.length} changed or missing transactions kept.`
                : `${undo.removedIds.length} imported transactions removed.`,
              'info',
            );
          } catch {
            toast('The import could not be undone safely.', 'error');
          }
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The import could not be completed.';
      setErrorMessage(message);
      toast(message, 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  const currentStepIndex = STEPS.findIndex((item) => item.key === step);
  const canGoBack = step === 'review' || step === 'confirm';
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0" onClick={requestClose} aria-label="Close import wizard" />
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-import-title"
        className="relative z-10 flex h-[96svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest shadow-2xl sm:h-[92vh] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-outline-variant/10 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {canGoBack && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Go to previous import step"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0">
              <h2 id="transaction-import-title" className="truncate font-headline text-lg font-bold text-primary">
                Import transactions
              </h2>
              <p className="text-micro font-bold text-on-surface-variant">
                {STEPS[currentStepIndex]?.label} · Step {currentStepIndex + 1} of {STEPS.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Close import wizard"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div
          className="flex shrink-0 gap-1.5 px-5 pt-3"
          role="progressbar"
          aria-label="Import progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={currentStepIndex + 1}
          aria-valuetext={`${STEPS[currentStepIndex]?.label}, step ${currentStepIndex + 1} of ${STEPS.length}`}
        >
          {STEPS.map((item, index) => (
            <div
              key={item.key}
              className={cn('h-1 flex-1 rounded-full', index <= currentStepIndex ? 'bg-primary' : 'bg-surface-container-high')}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <>
            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <FileUploadStep
                  onFileSelected={handleFileSelected}
                  isProcessing={false}
                  validationIssues={validationIssues}
                  errorMessage={errorMessage}
                />
              </motion.div>
            )}

            {step === 'validating' && (
              <motion.div
                key="validating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-80 flex-col items-center justify-center space-y-5 text-center"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">Validating locally</h3>
                  <p className="mt-1 max-w-xs text-sm text-on-surface-variant">
                    Checking structure, dates, amounts, formulas, and file limits on this device.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'review' && prepared && (
              <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <ReviewStep
                  prepared={prepared}
                  categories={categories}
                  onPreparedUpdated={setPrepared}
                  onAddCategory={addCategory}
                />
              </motion.div>
            )}

            {step === 'confirm' && prepared && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
                  {prepared.summary.uncategorizedRows > 0
                    ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-amber" aria-hidden="true" />
                    : <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />}
                  <div>
                    <h3 className="font-headline text-base font-bold text-on-surface">Review before import</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {prepared.summary.uncategorizedRows > 0
                        ? `${prepared.summary.uncategorizedRows} included transaction${prepared.summary.uncategorizedRows === 1 ? ' is' : 's are'} still Uncategorized.`
                        : 'Every included transaction has a category.'}
                    </p>
                  </div>
                </div>
                <dl className="divide-y divide-outline-variant/10 rounded-2xl bg-surface-container-low px-4">
                  <div className="flex justify-between gap-4 py-3 text-sm"><dt>Included</dt><dd className="font-bold">{prepared.summary.includedRows}</dd></div>
                  <div className="flex justify-between gap-4 py-3 text-sm"><dt>Excluded</dt><dd className="font-bold">{prepared.summary.excludedRows}</dd></div>
                  <div className="flex justify-between gap-4 py-3 text-sm"><dt>Possible duplicates kept</dt><dd className="font-bold">{prepared.rows.filter((row) => row.included && row.duplicateMatches.length > 0).length}</dd></div>
                </dl>
                {prepared.summary.uncategorizedRows > 0 && (
                  <Button variant="secondary" fullWidth onClick={() => setStep('review')}>
                    Go back and categorize
                  </Button>
                )}
                {errorMessage && (
                  <p role="alert" className="rounded-2xl bg-error/10 p-4 text-sm font-semibold text-error">
                    {errorMessage} You can retry without losing this review.
                  </p>
                )}
              </motion.div>
            )}

            {step === 'summary' && (
              <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ImportSummary
                  importedTransactions={importedTransactions}
                  reviewSummary={completedSummary}
                  duplicateRowsKept={duplicatesKept}
                  onViewUncategorized={completedSummary.uncategorizedRows > 0 ? onViewUncategorized : undefined}
                />
              </motion.div>
            )}
          </>
        </div>

        {(step === 'review' || step === 'confirm' || step === 'summary') && (
          <footer className="shrink-0 border-t border-outline-variant/10 bg-surface-container-lowest px-4 py-3 sm:px-5">
            {step === 'review' && prepared && (
              <Button fullWidth disabled={prepared.summary.includedRows === 0} onClick={() => setStep('confirm')}>
                Review {prepared.summary.includedRows} transactions
              </Button>
            )}
            {step === 'confirm' && prepared && (
              <Button fullWidth onClick={handleImport} disabled={isCommitting}>
                {isCommitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {prepared.summary.uncategorizedRows > 0
                  ? `${isCommitting ? 'Importing' : 'Import with'} ${prepared.summary.uncategorizedRows} Uncategorized`
                  : `Import ${prepared.summary.includedRows} transactions`}
              </Button>
            )}
            {step === 'summary' && <Button fullWidth onClick={closeImmediately}>Done</Button>}
          </footer>
        )}
      </motion.div>

      <ConfirmDialog
        isOpen={discardAction !== null}
        title="Discard import review?"
        message="Your review and category changes will be lost. The source file is not stored by Aura."
        confirmLabel="Discard review"
        cancelLabel="Keep reviewing"
        variant="danger"
        onConfirm={() => {
          const action = discardAction;
          setDiscardAction(null);
          if (action === 'close') closeImmediately();
          else reset();
        }}
        onCancel={() => setDiscardAction(null)}
      />
    </div>
  );
}
