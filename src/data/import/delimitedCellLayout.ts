import {
  splitImportV2DelimitedRecord,
  type ProfileRowInput,
} from '../../domain/import/v2';

export type ImportV2DelimitedCellDelimiter = ',' | ';' | '\t' | '|';

export interface ImportV2DelimitedCellLayout {
  sheetId: string;
  delimiter: ImportV2DelimitedCellDelimiter;
  rows: ProfileRowInput[];
}

const CSV_SHEET_ID = 'sheet-1';
const SHEET_ID_PREFIX = `${CSV_SHEET_ID}:delimited-cell:`;
const DELIMITERS: readonly ImportV2DelimitedCellDelimiter[] = [',', ';', '\t', '|'];
const DELIMITER_CODES: Record<ImportV2DelimitedCellDelimiter, string> = {
  ',': 'comma',
  ';': 'semicolon',
  '\t': 'tab',
  '|': 'pipe',
};
const CODE_DELIMITERS = new Map(
  Object.entries(DELIMITER_CODES).map(([delimiter, code]) => [code, delimiter as ImportV2DelimitedCellDelimiter]),
);

export function encodeDelimitedCellSheetId(delimiter: ImportV2DelimitedCellDelimiter): string {
  return `${SHEET_ID_PREFIX}${DELIMITER_CODES[delimiter]}`;
}

export function decodeDelimitedCellSheetId(sheetId: string): ImportV2DelimitedCellDelimiter | null {
  if (!sheetId.startsWith(SHEET_ID_PREFIX)) return null;
  return CODE_DELIMITERS.get(sheetId.slice(SHEET_ID_PREFIX.length)) ?? null;
}

/**
 * Materializes a quoted/encapsulated CSV shape where the outer CSV parser sees
 * exactly one source cell per row while that cell contains the real logical
 * fields. This is structural recovery only: no date/amount/description meaning
 * is inferred here.
 */
export function materializeDelimitedCellRows(
  rows: readonly ProfileRowInput[],
  delimiter: ImportV2DelimitedCellDelimiter,
): ProfileRowInput[] | null {
  if (rows.length < 2) return null;

  let logicalColumnCount: number | null = null;
  const materialized: ProfileRowInput[] = [];
  for (const row of rows) {
    if (row.cells.length !== 1 || typeof row.cells[0] !== 'string') return null;
    const split = splitImportV2DelimitedRecord(row.cells[0], delimiter);
    if (!split || split.length < 2) return null;
    if (logicalColumnCount == null) logicalColumnCount = split.length;
    if (split.length !== logicalColumnCount) return null;
    materialized.push({
      rowNumber: row.rowNumber,
      cells: split.map((cell) => cell.trim()),
    });
  }
  return materialized;
}

/**
 * Detects only an unambiguous repeated-field layout. If more than one delimiter
 * can explain the sampled one-cell rows, Aura leaves the profile source-shaped
 * rather than guessing a layout.
 */
export function detectDelimitedCellLayout(
  rows: readonly ProfileRowInput[],
): ImportV2DelimitedCellLayout | null {
  const candidates = DELIMITERS.flatMap((delimiter) => {
    const materialized = materializeDelimitedCellRows(rows, delimiter);
    return materialized ? [{ delimiter, rows: materialized }] : [];
  });
  if (candidates.length !== 1) return null;
  const candidate = candidates[0]!;
  return {
    sheetId: encodeDelimitedCellSheetId(candidate.delimiter),
    delimiter: candidate.delimiter,
    rows: candidate.rows,
  };
}
