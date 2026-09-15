import type { StructuredImportValidationResult } from '../../../domain/import';
import {
  createImportV2InterpretationPreview,
  type ConfirmedImportV2Interpretation,
} from '../../../domain/import/v2';
import {
  readImportV2ExecutionDocument,
  type RawImportV2DocumentRejectReason,
} from '../../../data/import/rawImportV2DocumentReader';

export type ConfirmedImportV2ExecutionOutcome =
  | { status: 'resolved'; validation: StructuredImportValidationResult }
  | {
      status: 'unresolved';
      validation: StructuredImportValidationResult;
      sourceRowNumbers: readonly number[];
    }
  | { status: 'rejected'; reason: RawImportV2DocumentRejectReason | 'invalid-confirmation' | 'invalid-plan' };

/**
 * Executes only an explicitly confirmed proposal over a fresh local read of the
 * full resource-bounded source. Harnex is not called from this boundary.
 */
export async function executeConfirmedImportV2Interpretation(
  file: File,
  confirmed: ConfirmedImportV2Interpretation,
  today?: string,
): Promise<ConfirmedImportV2ExecutionOutcome> {
  if (confirmed.status !== 'confirmed' || !confirmed.proposalId) {
    return { status: 'rejected', reason: 'invalid-confirmation' };
  }

  const read = await readImportV2ExecutionDocument(file);
  if (read.kind === 'rejected') return { status: 'rejected', reason: read.reason };

  let executed;
  try {
    executed = createImportV2InterpretationPreview(read.document, confirmed.plan, today);
  } catch {
    return { status: 'rejected', reason: 'invalid-plan' };
  }

  if (executed.unresolvedSourceRowNumbers.length > 0 || executed.validation.hasBlockingIssues) {
    const unresolved = new Set(executed.unresolvedSourceRowNumbers);
    for (const row of executed.validation.rows) {
      if (row.issues.some(({ severity }) => severity === 'error')) unresolved.add(row.sourceRowNumber);
    }
    return {
      status: 'unresolved',
      validation: executed.validation,
      sourceRowNumbers: [...unresolved].sort((left, right) => left - right),
    };
  }

  return { status: 'resolved', validation: executed.validation };
}
