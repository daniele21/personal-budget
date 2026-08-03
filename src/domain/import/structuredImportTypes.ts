export const STRUCTURED_IMPORT_LIMITS = {
  csvBytes: 10 * 1024 * 1024,
  xlsxBytes: 5 * 1024 * 1024,
  xlsxExpandedBytes: 32 * 1024 * 1024,
  xlsxEntries: 1_000,
  dataRows: 20_000,
  columns: 3,
  descriptionCodePoints: 2_000,
  maximumAbsoluteMinor: 99_999_999_999,
} as const;

export const STRUCTURED_IMPORT_HEADERS = ['date', 'description', 'amount'] as const;

export type StructuredImportColumn = (typeof STRUCTURED_IMPORT_HEADERS)[number];
export type StructuredImportSourceKind = 'structured-csv' | 'structured-xlsx';

export type ImportIssueCode =
  | 'unsupported_file_type'
  | 'invalid_csv_encoding'
  | 'invalid_csv_syntax'
  | 'file_too_large'
  | 'invalid_xlsx_container'
  | 'xlsx_resource_limit'
  | 'worksheet_missing'
  | 'empty_file'
  | 'row_limit_exceeded'
  | 'header_missing'
  | 'header_column_count'
  | 'header_duplicate'
  | 'header_unknown'
  | 'header_order'
  | 'mixed_csv_delimiter'
  | 'mixed_decimal_format'
  | 'row_column_count'
  | 'date_required'
  | 'date_format'
  | 'date_invalid'
  | 'description_required'
  | 'description_too_long'
  | 'description_control_character'
  | 'amount_required'
  | 'amount_format'
  | 'amount_zero'
  | 'amount_precision'
  | 'amount_out_of_range'
  | 'formula_cell_not_supported'
  | 'merged_cell_not_supported'
  | 'future_date'
  | 'additional_worksheets_ignored'
  | 'hidden_first_worksheet'
  | 'possible_duplicate'
  | 'uncategorized_rows';

export interface ImportIssue {
  code: ImportIssueCode;
  severity: 'error' | 'warning';
  rowNumber?: number;
  column?: StructuredImportColumn;
  messageKey: `import.issue.${ImportIssueCode}`;
}

export interface FormulaImportCell {
  kind: 'formula';
}

export type RawImportCell = string | number | Date | FormulaImportCell | undefined;

export interface RawStructuredImportRow {
  rowNumber: number;
  cells: RawImportCell[];
  mergedColumns?: StructuredImportColumn[];
}

export interface ValidatedStructuredImportRow {
  sourceRowNumber: number;
  date?: string;
  description?: string;
  signedAmountMinor?: number;
  issues: ImportIssue[];
}

export interface StructuredImportValidationResult {
  sourceKind: StructuredImportSourceKind;
  rows: ValidatedStructuredImportRow[];
  issues: ImportIssue[];
  hasBlockingIssues: boolean;
}

export type DescriptionMatchKey = string & { readonly __descriptionMatchKey: unique symbol };
export type DuplicateDetectionKey = string & { readonly __duplicateDetectionKey: unique symbol };

export interface DuplicateMatch {
  source: 'batch' | 'ledger';
  referenceId: string;
  count: number;
}

export type ImportCategorySource = 'uncategorized' | 'manual' | 'batch' | 'same-description';

export interface PreparedImportRow {
  rowId: string;
  sourceRowNumber: number;
  date: string;
  description: string;
  signedAmountMinor: number;
  type: 'expense' | 'income';
  category: string;
  categorySource: ImportCategorySource;
  included: boolean;
  selectedForBatch: boolean;
  descriptionMatchKey: DescriptionMatchKey;
  duplicateMatches: DuplicateMatch[];
  issues: ImportIssue[];
}

export interface ImportSummary {
  totalRows: number;
  includedRows: number;
  excludedRows: number;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  uncategorizedRows: number;
  warningRows: number;
  possibleDuplicateRows: number;
}

export interface ImportReviewRowState {
  category: string;
  categorySource: ImportCategorySource;
  included: boolean;
}

export interface ImportReviewUndoChange {
  rowId: string;
  previous: ImportReviewRowState;
}

export interface ImportReviewUndoEntry {
  kind: 'category' | 'inclusion' | 'duplicate-exclusion';
  changes: ImportReviewUndoChange[];
}

export interface PreparedTransactionImport {
  sourceKind: StructuredImportSourceKind;
  preparedAt: string;
  baseLedgerFingerprint: string;
  rows: PreparedImportRow[];
  issues: ImportIssue[];
  summary: ImportSummary;
  undoStack: ImportReviewUndoEntry[];
}

export type PreparedImport = PreparedTransactionImport;

export function createImportIssue(
  code: ImportIssueCode,
  severity: ImportIssue['severity'] = 'error',
  location: Pick<ImportIssue, 'rowNumber' | 'column'> = {},
): ImportIssue {
  return {
    code,
    severity,
    ...location,
    messageKey: `import.issue.${code}`,
  };
}
