import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import type { ImportIssue, ImportIssueCode } from '../../domain/import';

const ISSUE_MESSAGES: Record<ImportIssueCode, string> = {
  unsupported_file_type: 'Use a CSV or XLSX file.',
  invalid_csv_encoding: 'Save the CSV as UTF-8 and try again.',
  invalid_csv_syntax: 'Fix the CSV quoting or separators and try again.',
  file_too_large: 'This file exceeds the supported size limit.',
  invalid_xlsx_container: 'This Excel file cannot be read safely.',
  xlsx_resource_limit: 'This Excel file expands beyond the supported limit.',
  worksheet_missing: 'The workbook does not contain a worksheet.',
  empty_file: 'The file does not contain transaction rows.',
  row_limit_exceeded: 'This file contains more than 20,000 transaction rows.',
  header_missing: 'The first non-empty row must contain the required header.',
  header_column_count: 'The header must contain exactly three columns.',
  header_duplicate: 'Each required column can appear only once.',
  header_unknown: 'Use only date, description, and amount.',
  header_order: 'Use the column order date, description, amount.',
  mixed_csv_delimiter: 'Use one CSV delimiter throughout the file.',
  mixed_decimal_format: 'Use one decimal format throughout the amount column.',
  row_column_count: 'The row must contain exactly three columns.',
  date_required: 'Date is required.',
  date_format: 'Use the date format YYYY-MM-DD.',
  date_invalid: 'Use a real calendar date.',
  description_required: 'Description is required.',
  description_too_long: 'Description exceeds 2,000 characters.',
  description_control_character: 'Description contains an unsupported control character.',
  amount_required: 'Amount is required.',
  amount_format: 'Use a signed number without currency or grouping symbols.',
  amount_zero: 'Amount must not be zero.',
  amount_precision: 'Amount supports at most two decimal places.',
  amount_out_of_range: 'Amount exceeds the supported range.',
  formula_cell_not_supported: 'Formula cells are not supported.',
  merged_cell_not_supported: 'Merged cells are not supported.',
  future_date: 'This transaction has a future date.',
  possible_duplicate: 'This transaction may already exist.',
  additional_worksheets_ignored: 'Only the first worksheet is used.',
  hidden_first_worksheet: 'The first worksheet is hidden but will be read.',
  uncategorized_rows: 'Some included rows are still Uncategorized.',
};

export function importIssueMessage(issue: ImportIssue): string {
  const location = issue.rowNumber
    ? `Row ${issue.rowNumber}${issue.column ? `, ${issue.column}` : ''}: `
    : '';
  return `${location}${ISSUE_MESSAGES[issue.code]}`;
}

export function ValidationSummary({ issues }: { issues: readonly ImportIssue[] }) {
  const visibleIssues = issues.slice(0, 20);
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  return (
    <section
      role={errorCount > 0 ? 'alert' : 'status'}
      aria-label="File validation results"
      className="space-y-3 rounded-2xl bg-surface-container-low p-4"
    >
      <div className="flex items-start gap-3">
        {errorCount > 0
          ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
          : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-amber" aria-hidden="true" />}
        <div>
          <h4 className="text-sm font-bold text-on-surface">
            {errorCount > 0 ? 'File needs corrections' : 'Review these warnings'}
          </h4>
          <p className="mt-1 text-xs text-on-surface-variant">
            {errorCount > 0 ? 'Correct the file, then choose it again.' : 'Warnings do not block the import.'}
          </p>
        </div>
      </div>
      <ul className="space-y-2 text-xs text-on-surface-variant">
        {visibleIssues.map((issue, index) => (
          <li key={`${issue.code}-${issue.rowNumber ?? 'file'}-${index}`}>{importIssueMessage(issue)}</li>
        ))}
      </ul>
      {issues.length > visibleIssues.length && (
        <p className="text-micro font-bold text-on-surface-variant">
          And {issues.length - visibleIssues.length} more issues.
        </p>
      )}
    </section>
  );
}
