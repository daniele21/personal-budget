import {
  STRUCTURED_IMPORT_HEADERS,
  STRUCTURED_IMPORT_LIMITS,
  createImportIssue,
  type ImportIssue,
  type RawImportCell,
  type RawStructuredImportRow,
  type StructuredImportColumn,
  type StructuredImportSourceKind,
  type StructuredImportValidationResult,
  type ValidatedStructuredImportRow,
} from './structuredImportTypes';

export interface ValidateStructuredImportOptions {
  sourceKind: StructuredImportSourceKind;
  rows: RawStructuredImportRow[];
  csvDelimiter?: ',' | ';';
  initialIssues?: ImportIssue[];
  today?: string;
}

function isFormulaCell(value: RawImportCell): boolean {
  return typeof value === 'object' && value !== null && !(value instanceof Date) && value.kind === 'formula';
}

function cellText(value: RawImportCell): string {
  if (value == null || isFormulaCell(value)) return '';
  if (value instanceof Date) return formatCalendarDate(value);
  return String(value);
}

function normalizedHeader(value: RawImportCell, index: number): string {
  const text = cellText(value).trim().toLowerCase();
  return index === 0 ? text.replace(/^\uFEFF/, '') : text;
}

function formatCalendarDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateDate(value: RawImportCell, rowNumber: number, today: string): {
  value?: string;
  issues: ImportIssue[];
} {
  const location = { rowNumber, column: 'date' as const };
  if (isFormulaCell(value)) {
    return { issues: [createImportIssue('formula_cell_not_supported', 'error', location)] };
  }

  const text = value instanceof Date ? formatCalendarDate(value) : cellText(value).trim();
  if (!text) return { issues: [createImportIssue('date_required', 'error', location)] };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { issues: [createImportIssue('date_format', 'error', location)] };
  }

  const [year, month, day] = text.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    return { issues: [createImportIssue('date_invalid', 'error', location)] };
  }

  return {
    value: text,
    issues: text > today ? [createImportIssue('future_date', 'warning', location)] : [],
  };
}

function validateDescription(value: RawImportCell, rowNumber: number): {
  value?: string;
  issues: ImportIssue[];
} {
  const location = { rowNumber, column: 'description' as const };
  if (isFormulaCell(value)) {
    return { issues: [createImportIssue('formula_cell_not_supported', 'error', location)] };
  }
  const text = cellText(value).replace(/\r\n?|\n/g, ' ').trim();
  if (!text) return { issues: [createImportIssue('description_required', 'error', location)] };
  if ([...text].length > STRUCTURED_IMPORT_LIMITS.descriptionCodePoints) {
    return { issues: [createImportIssue('description_too_long', 'error', location)] };
  }
  if (/[\u0000-\u001F\u007F]/u.test(text)) {
    return { issues: [createImportIssue('description_control_character', 'error', location)] };
  }
  return { value: text, issues: [] };
}

type DecimalStyle = 'comma' | 'dot';

function validateAmount(
  value: RawImportCell,
  rowNumber: number,
  csvDelimiter?: ',' | ';',
): { value?: number; decimalStyle?: DecimalStyle; issues: ImportIssue[] } {
  const location = { rowNumber, column: 'amount' as const };
  if (isFormulaCell(value)) {
    return { issues: [createImportIssue('formula_cell_not_supported', 'error', location)] };
  }
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return { issues: [createImportIssue('amount_required', 'error', location)] };
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { issues: [createImportIssue('amount_format', 'error', location)] };
    const minor = Math.round(value * 100);
    if (Math.abs(value * 100 - minor) > 1e-7) {
      return { issues: [createImportIssue('amount_precision', 'error', location)] };
    }
    if (minor === 0) return { issues: [createImportIssue('amount_zero', 'error', location)] };
    if (Math.abs(minor) > STRUCTURED_IMPORT_LIMITS.maximumAbsoluteMinor) {
      return { issues: [createImportIssue('amount_out_of_range', 'error', location)] };
    }
    return { value: minor, issues: [] };
  }

  const text = String(value).trim();
  const decimalStyle: DecimalStyle | undefined = text.includes(',')
    ? 'comma'
    : text.includes('.')
      ? 'dot'
      : undefined;
  if (csvDelimiter === ',' && decimalStyle === 'comma') {
    return { issues: [createImportIssue('amount_format', 'error', location)] };
  }
  if (/[eE]/.test(text) || /[^+\-\d.,]/.test(text) || /[.,].*[.,]/.test(text)) {
    return { issues: [createImportIssue('amount_format', 'error', location)] };
  }
  const match = /^([+-]?)(\d+)(?:([.,])(\d+))?$/.exec(text);
  if (!match) return { issues: [createImportIssue('amount_format', 'error', location)] };
  const fraction = match[4] ?? '';
  if (fraction.length > 2) {
    return { decimalStyle, issues: [createImportIssue('amount_precision', 'error', location)] };
  }

  const integerMinor = Number(match[2]) * 100;
  const fractionMinor = Number(fraction.padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(integerMinor)) {
    return { decimalStyle, issues: [createImportIssue('amount_out_of_range', 'error', location)] };
  }
  const sign = match[1] === '-' ? -1 : 1;
  const minor = sign * (integerMinor + fractionMinor);
  if (minor === 0) return { decimalStyle, issues: [createImportIssue('amount_zero', 'error', location)] };
  if (Math.abs(minor) > STRUCTURED_IMPORT_LIMITS.maximumAbsoluteMinor) {
    return { decimalStyle, issues: [createImportIssue('amount_out_of_range', 'error', location)] };
  }
  return { value: minor, decimalStyle, issues: [] };
}

function validateHeader(header: RawStructuredImportRow | undefined): ImportIssue[] {
  if (!header) return [createImportIssue('header_missing')];
  const issues: ImportIssue[] = [];
  for (const column of header.mergedColumns ?? []) {
    issues.push(createImportIssue('merged_cell_not_supported', 'error', {
      rowNumber: header.rowNumber,
      column,
    }));
  }
  const formulaIndex = header.cells.findIndex(isFormulaCell);
  if (formulaIndex >= 0 && formulaIndex < STRUCTURED_IMPORT_HEADERS.length) {
    issues.push(createImportIssue('formula_cell_not_supported', 'error', {
      rowNumber: header.rowNumber,
      column: STRUCTURED_IMPORT_HEADERS[formulaIndex],
    }));
    return issues;
  }
  if (header.cells.length !== STRUCTURED_IMPORT_LIMITS.columns) {
    issues.push(createImportIssue('header_column_count', 'error', { rowNumber: header.rowNumber }));
  }

  const values = header.cells.map(normalizedHeader);
  if (values.some((value, index) => value && values.indexOf(value) !== index)) {
    issues.push(createImportIssue('header_duplicate', 'error', { rowNumber: header.rowNumber }));
  }
  if (values.some((value) => value && !STRUCTURED_IMPORT_HEADERS.includes(value as StructuredImportColumn))) {
    issues.push(createImportIssue('header_unknown', 'error', { rowNumber: header.rowNumber }));
  }
  if (STRUCTURED_IMPORT_HEADERS.some((expected, index) => values[index] !== expected)) {
    issues.push(createImportIssue('header_order', 'error', { rowNumber: header.rowNumber }));
  }
  return issues;
}

function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validateStructuredImport(
  options: ValidateStructuredImportOptions,
): StructuredImportValidationResult {
  const issues = [...(options.initialIssues ?? [])];
  if (options.rows.length === 0) {
    issues.push(createImportIssue('empty_file'));
    return { sourceKind: options.sourceKind, rows: [], issues, hasBlockingIssues: true };
  }

  const [header, ...dataRows] = options.rows;
  issues.push(...validateHeader(header));
  if (dataRows.length === 0) issues.push(createImportIssue('empty_file'));

  const today = options.today ?? localToday();
  const decimalStyles = new Set<DecimalStyle>();
  const rows: ValidatedStructuredImportRow[] = dataRows.map((row) => {
    const rowIssues: ImportIssue[] = [];
    if (row.cells.length !== STRUCTURED_IMPORT_LIMITS.columns) {
      rowIssues.push(createImportIssue('row_column_count', 'error', { rowNumber: row.rowNumber }));
    }
    for (const column of row.mergedColumns ?? []) {
      rowIssues.push(createImportIssue('merged_cell_not_supported', 'error', {
        rowNumber: row.rowNumber,
        column,
      }));
    }
    const date = validateDate(row.cells[0], row.rowNumber, today);
    const description = validateDescription(row.cells[1], row.rowNumber);
    const amount = validateAmount(row.cells[2], row.rowNumber, options.csvDelimiter);
    rowIssues.push(...date.issues, ...description.issues, ...amount.issues);
    if (amount.decimalStyle) decimalStyles.add(amount.decimalStyle);
    return {
      sourceRowNumber: row.rowNumber,
      date: date.value,
      description: description.value,
      signedAmountMinor: amount.value,
      issues: rowIssues,
    };
  });

  if (options.csvDelimiter === ';' && decimalStyles.size > 1) {
    issues.push(createImportIssue('mixed_decimal_format'));
  }
  issues.push(...rows.flatMap((row) => row.issues));
  return {
    sourceKind: options.sourceKind,
    rows,
    issues,
    hasBlockingIssues: issues.some((issue) => issue.severity === 'error'),
  };
}
