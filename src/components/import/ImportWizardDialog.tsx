import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, Loader2, ShieldCheck, X } from 'lucide-react';
import {
  applyImportCategory,
  groupPreparedRowsByDescription,
  type ImportIssue,
  type ImportSummary as ImportReviewSummary,
  type PreparedTransactionImport,
} from '../../domain/import';
import type { SpreadsheetProfile } from '../../domain/import/v2';
import {
  executeImportV2Mapping,
  inferImportV2SchemaWithHarnex,
  prepareTransactionImport,
  readTransactionImportFile,
  resolveImportV2Categories,
  type ImportV2CategorySuggestion,
} from '../../services/import';
import type { HarnexFailure } from '../../platform/harnex';
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
import { ImportV2MappingEditor } from './v2/ImportV2MappingEditor';
import { ImportV2TaskStatePanel } from './v2/ImportV2TaskStatePanel';
import { createImportV2MappingChoices } from './v2/importV2MappingOptions';
import {
  EMPTY_IMPORT_V2_MAPPING,
  type ImportV2AssistanceFailureReason,
  type ImportV2MappingDraft,
  type ImportV2TaskAction,
  type ImportV2TaskState,
} from './v2/importV2TaskState';

type WizardStep = 'upload' | 'validating' | 'mapping' | 'assistance' | 'review' | 'confirm' | 'summary';
type DisplayWizardStep = 'upload' | 'validating' | 'review' | 'confirm' | 'summary';

const STEPS: Array<{ key: DisplayWizardStep; label: string }> = [
  { key: 'upload', label: 'Upload' },
  { key: 'validating', label: 'Understand file' },
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

function assistanceFailureReason(failure: HarnexFailure): ImportV2AssistanceFailureReason {
  switch (failure.code) {
    case 'HOST_NOT_INSTALLED':
      return 'host-missing';
    case 'UNAUTHORIZED':
      return 'unauthorized';
    case 'USE_CASE_NOT_ASSIGNED':
    case 'USE_CASE_UNAVAILABLE':
    case 'INCOMPATIBLE':
    case 'CAPABILITY_CHANGED':
    case 'INVALID_REQUEST':
      return 'use-case-unready';
    case 'MODEL_UNAVAILABLE':
    case 'BUSY':
      return 'model-unready';
    default:
      return 'harnex-unavailable';
  }
}

function applyCategorySuggestions(
  prepared: PreparedTransactionImport,
  suggestions: readonly ImportV2CategorySuggestion[],
  activeCategories: readonly string[],
): PreparedTransactionImport {
  let next = prepared;
  const active = new Set(activeCategories);
  for (const suggestion of suggestions) {
    if (!active.has(suggestion.category)) continue;
    const rowId = suggestion.rowIds.find((candidate) => next.rows.some((row) => row.rowId === candidate));
    if (!rowId) continue;
    next = applyImportCategory(next, {
      rowId,
      category: suggestion.category,
      scope: 'same-description',
      activeCategories,
    });
  }
  return next;
}

function v2FailureMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'mixed_header_mapping':
      return 'Choose date, amount, and description columns from the same table.';
    case 'unknown_candidate_id':
    case 'incomplete_mapping':
    case 'duplicate_description_column':
      return 'The selected mapping is no longer valid. Review the columns and try again.';
    case 'unsupported_type_mapping':
      return 'This transaction-type mapping is not supported yet. Use the amount rule to determine income and expenses.';
    case 'unsupported_currency':
      return 'This import currently supports EUR transactions only.';
    case 'sheet_mapping_mismatch':
      return 'The selected worksheet no longer matches the profiled file. Choose the file again.';
    default:
      return error instanceof Error ? error.message : 'The selected columns could not be checked safely.';
  }
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
  const operationRevisionRef = useRef(0);
  const assistanceAbortRef = useRef<AbortController | null>(null);
  const categoryBasePreparedRef = useRef<PreparedTransactionImport | null>(null);
  const [step, setStep] = useState<WizardStep>('upload');
  const [prepared, setPrepared] = useState<PreparedTransactionImport | null>(null);
  const [validationIssues, setValidationIssues] = useState<ImportIssue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [v2File, setV2File] = useState<File | null>(null);
  const [v2Profile, setV2Profile] = useState<SpreadsheetProfile | null>(null);
  const [v2Mapping, setV2Mapping] = useState<ImportV2MappingDraft>(EMPTY_IMPORT_V2_MAPPING);
  const [v2MappingResolution, setV2MappingResolution] = useState<'resolved' | 'ambiguous'>('ambiguous');
  const [v2MappingIssues, setV2MappingIssues] = useState<string[]>([]);
  const [v2TaskState, setV2TaskState] = useState<ImportV2TaskState>({ kind: 'idle', step: 'upload' });
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);
  const [importedTransactions, setImportedTransactions] = useState<Transaction[]>([]);
  const [completedSummary, setCompletedSummary] = useState<ImportReviewSummary>(emptySummary(0));
  const [duplicatesKept, setDuplicatesKept] = useState(0);
  const [discardAction, setDiscardAction] = useState<'close' | 'upload' | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const reset = useCallback(() => {
    operationRevisionRef.current += 1;
    assistanceAbortRef.current?.abort();
    assistanceAbortRef.current = null;
    categoryBasePreparedRef.current = null;
    setStep('upload');
    setPrepared(null);
    setValidationIssues([]);
    setErrorMessage(null);
    setV2File(null);
    setV2Profile(null);
    setV2Mapping(EMPTY_IMPORT_V2_MAPPING);
    setV2MappingResolution('ambiguous');
    setV2MappingIssues([]);
    setV2TaskState({ kind: 'idle', step: 'upload' });
    setCategoryNotice(null);
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

  const runSchemaAssistance = useCallback(async (profile: SpreadsheetProfile, operationRevision: number) => {
    assistanceAbortRef.current?.abort();
    const controller = new AbortController();
    assistanceAbortRef.current = controller;
    setV2TaskState({ kind: 'local-analysis', step: 'understand-file' });
    setStep('assistance');

    try {
      const outcome = await inferImportV2SchemaWithHarnex(profile, { signal: controller.signal });
      if (operationRevision !== operationRevisionRef.current) return;
      if (assistanceAbortRef.current === controller) assistanceAbortRef.current = null;

      if (outcome.status === 'resolved') {
        setV2Mapping(outcome.suggestion.selection);
        setV2MappingResolution('resolved');
        setV2MappingIssues([]);
        setV2TaskState({
          kind: 'mapping-review',
          step: 'understand-file',
          resolution: 'resolved',
          origin: 'assisted',
          mapping: outcome.suggestion.selection,
          issues: [],
        });
        setStep('mapping');
        return;
      }

      if (outcome.status === 'ambiguous' || outcome.status === 'unsupported') {
        const issues = [outcome.status === 'unsupported'
          ? 'Optional assistance could not choose a safe mapping for this file. Review the columns manually.'
          : 'Optional assistance found more than one safe interpretation. Review the columns manually.'];
        setV2Mapping(EMPTY_IMPORT_V2_MAPPING);
        setV2MappingResolution('ambiguous');
        setV2MappingIssues(issues);
        setV2TaskState({
          kind: 'mapping-review',
          step: 'understand-file',
          resolution: 'ambiguous',
          origin: 'manual',
          mapping: EMPTY_IMPORT_V2_MAPPING,
          issues,
        });
        setStep('mapping');
        return;
      }

      setV2TaskState(outcome.failure.code === 'CANCELLED'
        ? { kind: 'cancelled', step: 'understand-file' }
        : {
            kind: 'assistance-unavailable',
            step: 'understand-file',
            reason: assistanceFailureReason(outcome.failure),
          });
      setStep('assistance');
    } catch {
      if (operationRevision !== operationRevisionRef.current) return;
      if (assistanceAbortRef.current === controller) assistanceAbortRef.current = null;
      setV2TaskState({ kind: 'assistance-unavailable', step: 'understand-file', reason: 'harnex-unavailable' });
      setStep('assistance');
    }
  }, []);

  const runCategoryAssistance = useCallback(async (
    basePrepared: PreparedTransactionImport,
    operationRevision: number,
    preserveBase = false,
  ) => {
    assistanceAbortRef.current?.abort();
    const controller = new AbortController();
    assistanceAbortRef.current = controller;
    if (!preserveBase) categoryBasePreparedRef.current = basePrepared;
    setPrepared(basePrepared);
    setCategoryNotice(null);
    const totalGroups = groupPreparedRowsByDescription(basePrepared.rows).length;
    setV2TaskState({ kind: 'classification-progress', step: 'categorize', completed: 0, total: totalGroups });
    setStep('assistance');

    try {
      const resolution = await resolveImportV2Categories(basePrepared, transactions, categories, { signal: controller.signal });
      if (operationRevision !== operationRevisionRef.current) return;
      if (assistanceAbortRef.current === controller) assistanceAbortRef.current = null;

      const categorized = applyCategorySuggestions(basePrepared, resolution.suggestions, categories);
      categoryBasePreparedRef.current = categorized;
      setPrepared(categorized);
      const completedGroups = new Set(resolution.suggestions.map((suggestion) => suggestion.groupId)).size;
      const failedGroups = Math.max(0, totalGroups - completedGroups);

      if (resolution.harnex.status === 'completed' || resolution.harnex.status === 'not-needed') {
        setV2TaskState({ kind: 'review', step: 'review' });
        setStep('review');
        return;
      }
      if (resolution.harnex.status === 'unavailable') {
        setV2TaskState({
          kind: 'assistance-unavailable',
          step: 'categorize',
          reason: assistanceFailureReason(resolution.harnex.failure),
        });
        setStep('assistance');
        return;
      }
      if (resolution.harnex.status === 'cancelled') {
        setV2TaskState({ kind: 'cancelled', step: 'categorize' });
        setStep('assistance');
        return;
      }
      setV2TaskState({
        kind: 'classification-partial-failure',
        step: 'categorize',
        completed: completedGroups,
        failed: failedGroups,
        total: totalGroups,
      });
      setStep('assistance');
    } catch {
      if (operationRevision !== operationRevisionRef.current) return;
      if (assistanceAbortRef.current === controller) assistanceAbortRef.current = null;
      setV2TaskState({ kind: 'assistance-unavailable', step: 'categorize', reason: 'harnex-unavailable' });
      setStep('assistance');
    }
  }, [categories, transactions]);

  const handleFileSelected = useCallback(async (file: File) => {
    const operationRevision = ++operationRevisionRef.current;
    assistanceAbortRef.current?.abort();
    assistanceAbortRef.current = null;
    categoryBasePreparedRef.current = null;
    setStep('validating');
    setValidationIssues([]);
    setErrorMessage(null);
    setV2MappingIssues([]);
    setCategoryNotice(null);
    setV2TaskState({ kind: 'idle', step: 'upload' });
    try {
      const result = await readTransactionImportFile(file);
      if (operationRevision !== operationRevisionRef.current) return;
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
        if (operationRevision !== operationRevisionRef.current) return;
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
      if (result.kind === 'mapping-required') {
        const choices = createImportV2MappingChoices(result.profile);
        if (choices.dateOptions.length === 0 || choices.amountOptions.length === 0 || choices.descriptionOptions.length === 0) {
          setErrorMessage('Aura could not find a safe date, amount, and description mapping for this file.');
          setStep('upload');
          return;
        }
        setV2File(file);
        setV2Profile(result.profile);
        setV2Mapping(EMPTY_IMPORT_V2_MAPPING);
        setV2MappingResolution('ambiguous');
        await runSchemaAssistance(result.profile, operationRevision);
        return;
      }
      if (result.validation.hasBlockingIssues) {
        setValidationIssues(result.validation.issues);
        setStep('upload');
        return;
      }
      const nextPrepared = await prepareTransactionImport(result.validation, transactions);
      if (operationRevision !== operationRevisionRef.current) return;
      if (nextPrepared.rows.length === 0) throw new Error('The file does not contain valid transaction rows.');
      setPrepared(nextPrepared);
      setStep('review');
    } catch (error) {
      if (operationRevision !== operationRevisionRef.current) return;
      const message = error instanceof Error ? error.message : 'The file could not be validated.';
      setErrorMessage(message);
      setStep('upload');
      toast(message, 'error');
    }
  }, [commitExistingTransactionImport, runSchemaAssistance, toast, transactions, undoTransactionImport]);

  const handleConfirmV2Mapping = useCallback(async () => {
    if (!v2File || !v2Profile || !v2Mapping.dateCandidateId || !v2Mapping.amountCandidateId) return;
    const operationRevision = ++operationRevisionRef.current;
    setV2TaskState({ kind: 'checking-transactions', step: 'check-transactions' });
    setStep('validating');
    setV2MappingIssues([]);
    setErrorMessage(null);
    try {
      const validation = await executeImportV2Mapping(v2File, v2Profile, {
        dateCandidateId: v2Mapping.dateCandidateId,
        amountCandidateId: v2Mapping.amountCandidateId,
        descriptionColumnIds: v2Mapping.descriptionColumnIds,
        typeColumnId: v2Mapping.typeColumnId,
      });
      if (operationRevision !== operationRevisionRef.current) return;
      if (validation.hasBlockingIssues) {
        setV2MappingIssues([
          'One or more selected transaction rows contain a date, amount, formula, or merged cell that Aura cannot import safely.',
          'Adjust the mapping or correct the source file before continuing.',
        ]);
        setV2MappingResolution('ambiguous');
        setStep('mapping');
        return;
      }
      const nextPrepared = await prepareTransactionImport(validation, transactions);
      if (operationRevision !== operationRevisionRef.current) return;
      if (nextPrepared.rows.length === 0) throw new Error('The selected mapping does not produce valid transaction rows.');
      await runCategoryAssistance(nextPrepared, operationRevision);
    } catch (error) {
      if (operationRevision !== operationRevisionRef.current) return;
      setV2MappingIssues([v2FailureMessage(error)]);
      setV2MappingResolution('ambiguous');
      setStep('mapping');
    }
  }, [runCategoryAssistance, transactions, v2File, v2Mapping, v2Profile]);

  const handleV2TaskAction = useCallback(async (action: ImportV2TaskAction) => {
    if (action === 'continue-manually') {
      if (v2TaskState.step === 'understand-file') {
        const issues = ['Choose the columns that match the transaction table, then confirm the mapping.'];
        setV2Mapping(EMPTY_IMPORT_V2_MAPPING);
        setV2MappingResolution('ambiguous');
        setV2MappingIssues(issues);
        setV2TaskState({
          kind: 'mapping-review',
          step: 'understand-file',
          resolution: 'ambiguous',
          origin: 'manual',
          mapping: EMPTY_IMPORT_V2_MAPPING,
          issues,
        });
        setStep('mapping');
      } else if (prepared) {
        if (v2TaskState.kind === 'classification-partial-failure') {
          setCategoryNotice(`${v2TaskState.completed} of ${v2TaskState.total} transaction groups received category suggestions. The rest stay Uncategorized for Review.`);
        } else if (v2TaskState.kind === 'cancelled') {
          setCategoryNotice('Category assistance was stopped. Prepared transactions remain available for manual Review.');
        } else {
          setCategoryNotice('Optional category assistance is unavailable. Prepared transactions remain available for manual Review.');
        }
        setV2TaskState({ kind: 'review', step: 'review' });
        setStep('review');
      }
      return;
    }

    if (action === 'retry') {
      const operationRevision = ++operationRevisionRef.current;
      if (v2TaskState.step === 'understand-file' && v2Profile) {
        await runSchemaAssistance(v2Profile, operationRevision);
      } else if (v2TaskState.step === 'categorize' && categoryBasePreparedRef.current) {
        await runCategoryAssistance(categoryBasePreparedRef.current, operationRevision, true);
      }
      return;
    }

    if (action === 'cancel') {
      if (v2TaskState.kind === 'local-analysis' || v2TaskState.kind === 'classification-progress') {
        assistanceAbortRef.current?.abort();
        return;
      }
      if (v2TaskState.step === 'categorize' && prepared) setDiscardAction('upload');
      else reset();
    }
  }, [prepared, reset, runCategoryAssistance, runSchemaAssistance, v2Profile, v2TaskState]);

  const handleBack = () => {
    if (step === 'confirm') setStep('review');
    else if (step === 'review') setDiscardAction('upload');
    else if (step === 'mapping') reset();
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

  const displayStep: DisplayWizardStep = step === 'mapping'
    ? 'validating'
    : step === 'assistance'
      ? (v2TaskState.step === 'categorize' ? 'review' : 'validating')
      : step;
  const currentStepIndex = STEPS.findIndex((item) => item.key === displayStep);
  const canGoBack = step === 'mapping' || step === 'review' || step === 'confirm';
  const v2Choices = v2Profile ? createImportV2MappingChoices(v2Profile) : null;
  const isCheckingMappedTransactions = v2TaskState.kind === 'checking-transactions';
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
                <Loader2 className="h-10 w-10 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">
                    {isCheckingMappedTransactions ? 'Checking mapped transactions' : 'Validating locally'}
                  </h3>
                  <p className="mt-1 max-w-xs text-sm text-on-surface-variant">
                    {isCheckingMappedTransactions
                      ? 'Applying your confirmed mapping and checking transaction rows before categorization.'
                      : 'Checking structure, dates, amounts, formulas, and file limits on this device.'}
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'assistance' && (
              <motion.div key="assistance" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <ImportV2TaskStatePanel state={v2TaskState} onAction={handleV2TaskAction} />
              </motion.div>
            )}

            {step === 'mapping' && v2Choices && (
              <motion.div key="mapping" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <ImportV2MappingEditor
                  resolution={v2MappingResolution}
                  value={v2Mapping}
                  dateOptions={v2Choices.dateOptions}
                  amountOptions={v2Choices.amountOptions}
                  descriptionOptions={v2Choices.descriptionOptions}
                  issues={v2MappingIssues}
                  onChange={(next) => {
                    setV2Mapping(next);
                    setV2MappingResolution('ambiguous');
                    setV2MappingIssues([]);
                  }}
                  onConfirm={handleConfirmV2Mapping}
                  onCancel={reset}
                />
              </motion.div>
            )}

            {step === 'review' && prepared && (
              <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                {categoryNotice && (
                  <div role="status" className="flex items-start gap-3 rounded-2xl bg-surface-container-low p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-amber" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-on-surface-variant">{categoryNotice}</p>
                  </div>
                )}
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
