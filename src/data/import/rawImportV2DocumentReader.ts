import type ExcelJS from 'exceljs';
import { STRUCTURED_IMPORT_LIMITS } from '../../domain/import';
import {
  IMPORT_V2_INTERPRETATION_CONTRACT_VERSION,
  IMPORT_V2_INTERPRETATION_LIMITS,
  type ImportV2RawCell,
  type ImportV2RawDocument,
  type ImportV2RawRow,
  type ImportV2RawSheet,
} from '../../domain/import/v2';
import {
  isSupportedStructuredImportFile,
  preflightXlsxContainer,
} from './spreadsheetFileReader';

export type RawImportV2DocumentRejectReason =
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'invalid_csv_encoding'
  | 'invalid_csv_syntax'
  | 'invalid_xlsx_container'
  | 'xlsx_resource_limit'
  | 'worksheet_missing'
  | 'worksheet_limit_exceeded'
  | 'row_limit_exceeded'
  | 'column_limit_exceeded';

export type RawImportV2DocumentReadResult =
  | { kind: 'read'; document: ImportV2RawDocument }
  | { kind: 'rejected'; reason: RawImportV2DocumentRejectReason };

const MAX_NON_EMPTY_ROWS = STRUCTURED_IMPORT_LIMITS.dataRows + 1;

type ReadOptions = {
  retainedRowsPerSheet: number;
  cellCodePoints: number;
};

const HARNEX_SAMPLE_OPTIONS: ReadOptions = {
  retainedRowsPerSheet: IMPORT_V2_INTERPRETATION_LIMITS.sampledRowsPerSheet,
  cellCodePoints: IMPORT_V2_INTERPRETATION_LIMITS.cellCodePoints,
};

const EXECUTION_OPTIONS: ReadOptions = {
  retainedRowsPerSheet: MAX_NON_EMPTY_ROWS,
  // Preserve one code point beyond the canonical description limit so the
  // deterministic validator can still detect oversize descriptions instead of
  // accepting silently truncated source content.
  cellCodePoints: STRUCTURED_IMPORT_LIMITS.descriptionCodePoints + 1,
};

function rejected(reason: RawImportV2DocumentRejectReason): RawImportV2DocumentReadResult {
  return { kind: 'rejected', reason };
}

function clampText(value: string, limit: number): string {
  return Array.from(value).slice(0, limit).join('');
}

function isEmptyRawRow(cells: readonly ImportV2RawCell[]): boolean {
  return cells.every((cell) => cell == null || (typeof cell === 'string' && cell.trim() === ''));
}

async function isValidUtf8(file: File): Promise<boolean> {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    if (typeof file.stream === 'function') {
      const reader = file.stream().getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        decoder.decode(value, { stream: true });
      }
      decoder.decode();
    } else {
      decoder.decode(await file.arrayBuffer());
    }
    return true;
  } catch {
    return false;
  }
}

async function readCsv(file: File, options: ReadOptions): Promise<RawImportV2DocumentReadResult> {
  if (!(await isValidUtf8(file))) return rejected('invalid_csv_encoding');
  const { default: Papa } = await import('papaparse');

  return new Promise((resolve) => {
    const rows: ImportV2RawRow[] = [];
    let logicalRowNumber = 0;
    let totalNonEmptyRows = 0;
    let failure: RawImportV2DocumentRejectReason | undefined;

    Papa.parse<string[]>(file, {
      delimiter: '',
      delimitersToGuess: [',', ';', '\t', '|'],
      dynamicTyping: false,
      skipEmptyLines: false,
      step: (stepResult, parser) => {
        logicalRowNumber += 1;
        if (stepResult.errors.some(({ code }) => code === 'MissingQuotes' || code === 'InvalidQuotes')) {
          failure = 'invalid_csv_syntax';
          parser.abort();
          return;
        }

        const cells = stepResult.data.map((cell) => clampText(String(cell), options.cellCodePoints));
        if (isEmptyRawRow(cells)) return;
        totalNonEmptyRows += 1;
        if (totalNonEmptyRows > MAX_NON_EMPTY_ROWS) {
          failure = 'row_limit_exceeded';
          parser.abort();
          return;
        }
        if (cells.length > IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns) {
          failure = 'column_limit_exceeded';
          parser.abort();
          return;
        }
        if (rows.length < options.retainedRowsPerSheet) {
          rows.push({ rowNumber: logicalRowNumber, cells });
        }
      },
      complete: () => {
        if (failure) {
          resolve(rejected(failure));
          return;
        }
        resolve({
          kind: 'read',
          document: {
            contractVersion: IMPORT_V2_INTERPRETATION_CONTRACT_VERSION,
            sourceKind: 'csv',
            sheets: [{
              id: 'sheet-1',
              name: 'CSV',
              state: 'visible',
              rows,
              totalNonEmptyRows,
              samplesTruncated: totalNonEmptyRows > rows.length,
            }],
          },
        });
      },
      error: () => resolve(rejected('invalid_csv_syntax')),
    });
  });
}

function xlsxCell(value: ExcelJS.CellValue, cellCodePoints: number): ImportV2RawCell {
  if (value == null) return undefined;
  if (value instanceof Date) return { kind: 'date', isoDate: value.toISOString() };
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return clampText(value, cellCodePoints);
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) return { kind: 'formula' };
    if ('richText' in value && Array.isArray(value.richText)) {
      return clampText(value.richText.map((part) => part.text).join(''), cellCodePoints);
    }
    if ('text' in value && typeof value.text === 'string') return clampText(value.text, cellCodePoints);
  }
  return clampText(String(value), cellCodePoints);
}

function readWorksheet(
  worksheet: ExcelJS.Worksheet,
  sheetIndex: number,
  options: ReadOptions,
): ImportV2RawSheet | RawImportV2DocumentReadResult {
  const rows: ImportV2RawRow[] = [];
  let totalNonEmptyRows = 0;
  let failure: RawImportV2DocumentRejectReason | undefined;

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (failure) return;
    if (row.cellCount > IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns) {
      failure = 'column_limit_exceeded';
      return;
    }

    const cells: ImportV2RawCell[] = [];
    const mergedColumnIndexes: number[] = [];
    for (let column = 1; column <= row.cellCount; column += 1) {
      const cell = row.getCell(column);
      cells.push(xlsxCell(cell.value, options.cellCodePoints));
      if (cell.isMerged) mergedColumnIndexes.push(column - 1);
    }
    if (isEmptyRawRow(cells)) return;

    totalNonEmptyRows += 1;
    if (totalNonEmptyRows > MAX_NON_EMPTY_ROWS) {
      failure = 'row_limit_exceeded';
      return;
    }
    if (rows.length < options.retainedRowsPerSheet) {
      rows.push({
        rowNumber,
        cells,
        ...(mergedColumnIndexes.length > 0 ? { mergedColumnIndexes } : {}),
      });
    }
  });

  if (failure) return rejected(failure);
  return {
    id: `sheet-${sheetIndex + 1}`,
    name: clampText(worksheet.name, options.cellCodePoints),
    state: worksheet.state,
    rows,
    totalNonEmptyRows,
    samplesTruncated: totalNonEmptyRows > rows.length,
  };
}

async function readXlsx(file: File, options: ReadOptions): Promise<RawImportV2DocumentReadResult> {
  const buffer = await file.arrayBuffer();
  const preflight = preflightXlsxContainer(new Uint8Array(buffer));
  if ('code' in preflight) return rejected(preflight.code);

  try {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    if (workbook.worksheets.length === 0) return rejected('worksheet_missing');
    if (workbook.worksheets.length > IMPORT_V2_INTERPRETATION_LIMITS.worksheets) {
      return rejected('worksheet_limit_exceeded');
    }

    const sheets: ImportV2RawSheet[] = [];
    for (const [sheetIndex, worksheet] of workbook.worksheets.entries()) {
      const sheet = readWorksheet(worksheet, sheetIndex, options);
      if ('kind' in sheet) return sheet;
      sheets.push(sheet);
    }

    return {
      kind: 'read',
      document: {
        contractVersion: IMPORT_V2_INTERPRETATION_CONTRACT_VERSION,
        sourceKind: 'xlsx',
        sheets,
      },
    };
  } catch {
    return rejected('invalid_xlsx_container');
  }
}

async function readDocument(file: File, options: ReadOptions): Promise<RawImportV2DocumentReadResult> {
  if (!isSupportedStructuredImportFile(file.name)) return rejected('unsupported_file_type');
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv') && file.size > STRUCTURED_IMPORT_LIMITS.csvBytes) {
    return rejected('file_too_large');
  }
  if (lowerName.endsWith('.xlsx') && file.size > STRUCTURED_IMPORT_LIMITS.xlsxBytes) {
    return rejected('file_too_large');
  }
  return lowerName.endsWith('.csv') ? readCsv(file, options) : readXlsx(file, options);
}

/**
 * Reads a bounded, source-shaped document view after technical/resource safety
 * gates only. It intentionally does not decide what the rows/columns mean.
 * This sampled representation is session-only Harnex input and must never be
 * logged or persisted.
 */
export async function readRawImportV2Document(file: File): Promise<RawImportV2DocumentReadResult> {
  return readDocument(file, HARNEX_SAMPLE_OPTIONS);
}

/**
 * Re-reads the already user-selected file locally after a proposal is confirmed
 * so Aura can execute the declarative plan over all resource-bounded rows. This
 * representation is never Harnex input and is not persisted.
 */
export async function readImportV2ExecutionDocument(file: File): Promise<RawImportV2DocumentReadResult> {
  return readDocument(file, EXECUTION_OPTIONS);
}
