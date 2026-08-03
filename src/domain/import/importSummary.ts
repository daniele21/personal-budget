import { createImportIssue, type ImportIssue, type ImportSummary, type PreparedImportRow } from './structuredImportTypes';

export function calculateImportSummary(rows: readonly PreparedImportRow[]): ImportSummary {
  let includedRows = 0;
  let incomeMinor = 0;
  let expenseMinor = 0;
  let uncategorizedRows = 0;
  let warningRows = 0;
  let possibleDuplicateRows = 0;

  for (const row of rows) {
    if (row.included) {
      includedRows += 1;
      if (row.signedAmountMinor > 0) incomeMinor += row.signedAmountMinor;
      else expenseMinor += Math.abs(row.signedAmountMinor);
      if (row.category === 'Uncategorized') uncategorizedRows += 1;
    }
    if (row.issues.some((issue) => issue.severity === 'warning')) warningRows += 1;
    if (row.duplicateMatches.length > 0) possibleDuplicateRows += 1;
  }

  return {
    totalRows: rows.length,
    includedRows,
    excludedRows: rows.length - includedRows,
    incomeMinor,
    expenseMinor,
    netMinor: incomeMinor - expenseMinor,
    uncategorizedRows,
    warningRows,
    possibleDuplicateRows,
  };
}

export function reviewSummaryIssues(
  baseIssues: readonly ImportIssue[],
  rows: readonly PreparedImportRow[],
): ImportIssue[] {
  const issues = baseIssues.filter((issue) => issue.code !== 'uncategorized_rows');
  if (rows.some((row) => row.included && row.category === 'Uncategorized')) {
    issues.push(createImportIssue('uncategorized_rows', 'warning'));
  }
  return issues;
}
