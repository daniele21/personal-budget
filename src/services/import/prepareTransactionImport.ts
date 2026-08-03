import type { Transaction } from '../../types';
import { canonicalStringify, sha256String } from '../../domain/archive';
import {
  attachDuplicateMatches,
  calculateImportSummary,
  createDescriptionMatchKey,
  createImportIssue,
  normalizeImportDescription,
  reviewSummaryIssues,
  type ImportIssue,
  type PreparedImportRow,
  type PreparedTransactionImport,
  type StructuredImportValidationResult,
} from '../../domain/import';

export interface PrepareTransactionImportOptions {
  preparedAt?: string;
}

function ledgerProjection(transaction: Transaction) {
  const absoluteMinor = Math.round(Math.abs(transaction.amount) * 100);
  return {
    id: transaction.id,
    date: transaction.date.slice(0, 10),
    signedAmountMinor: transaction.type === 'expense' ? -absoluteMinor : absoluteMinor,
    normalizedDescription: normalizeImportDescription(transaction.description),
  };
}

export async function createImportLedgerFingerprint(
  ledger: readonly Transaction[],
): Promise<string> {
  const projection = [...ledger]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(ledgerProjection);
  return sha256String(canonicalStringify(projection));
}

function validPreparedRows(validation: StructuredImportValidationResult): PreparedImportRow[] {
  return validation.rows.flatMap((row) => {
    if (
      !row.date
      || !row.description
      || row.signedAmountMinor == null
      || row.issues.some((issue) => issue.severity === 'error')
    ) return [];
    const type = row.signedAmountMinor < 0 ? 'expense' : 'income';
    return [{
      rowId: `import-row-${row.sourceRowNumber}`,
      sourceRowNumber: row.sourceRowNumber,
      date: row.date,
      description: row.description,
      signedAmountMinor: row.signedAmountMinor,
      type,
      category: 'Uncategorized',
      categorySource: 'uncategorized',
      included: true,
      selectedForBatch: false,
      descriptionMatchKey: createDescriptionMatchKey(row.description, type),
      duplicateMatches: [],
      issues: [...row.issues],
    } satisfies PreparedImportRow];
  });
}

function withDuplicateIssues(rows: PreparedImportRow[]): {
  rows: PreparedImportRow[];
  issues: ImportIssue[];
} {
  const issues: ImportIssue[] = [];
  return {
    rows: rows.map((row) => {
      if (row.duplicateMatches.length === 0) return row;
      const issue = createImportIssue('possible_duplicate', 'warning', {
        rowNumber: row.sourceRowNumber,
      });
      issues.push(issue);
      return { ...row, issues: [...row.issues, issue] };
    }),
    issues,
  };
}

export async function prepareTransactionImport(
  validation: StructuredImportValidationResult,
  ledger: readonly Transaction[],
  options: PrepareTransactionImportOptions = {},
): Promise<PreparedTransactionImport> {
  const rowsWithMatches = attachDuplicateMatches(validPreparedRows(validation), ledger);
  const duplicateResult = withDuplicateIssues(rowsWithMatches);
  const issues = reviewSummaryIssues(
    [...validation.issues, ...duplicateResult.issues],
    duplicateResult.rows,
  );
  return {
    sourceKind: validation.sourceKind,
    preparedAt: options.preparedAt ?? new Date().toISOString(),
    baseLedgerFingerprint: await createImportLedgerFingerprint(ledger),
    rows: duplicateResult.rows,
    issues,
    summary: calculateImportSummary(duplicateResult.rows),
    undoStack: [],
  };
}

