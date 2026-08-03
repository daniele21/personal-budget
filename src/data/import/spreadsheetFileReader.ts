import type ExcelJS from 'exceljs';
import {
  STRUCTURED_IMPORT_HEADERS,
  STRUCTURED_IMPORT_LIMITS,
  createImportIssue,
  type FormulaImportCell,
  type ImportIssue,
  type RawImportCell,
  type RawStructuredImportRow,
} from '../../domain/import';

export const SUPPORTED_STRUCTURED_IMPORT_EXTENSIONS = ['.csv', '.xlsx'] as const;

export interface ParsedLocalSpreadsheet {
  sheetName: string;
  rows: RawStructuredImportRow[];
  csvDelimiter?: ',' | ';';
  issues: ImportIssue[];
}

export type LocalSpreadsheetReadResult =
  | { kind: 'parsed'; sourceKind: 'structured-csv' | 'structured-xlsx'; spreadsheet: ParsedLocalSpreadsheet }
  | { kind: 'rejected'; issues: ImportIssue[] };

export interface RawSpreadsheetFile {
  sheetName: string;
  rawRows: string[][];
}

function rejected(code: ImportIssue['code']): LocalSpreadsheetReadResult {
  return { kind: 'rejected', issues: [createImportIssue(code)] };
}

export function isSupportedStructuredImportFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return SUPPORTED_STRUCTURED_IMPORT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

function isEmptyRow(cells: RawImportCell[]): boolean {
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

async function parseCsvIncrementally(file: File): Promise<ParsedLocalSpreadsheet> {
  if (!(await isValidUtf8(file))) {
    return { sheetName: 'CSV', rows: [], issues: [createImportIssue('invalid_csv_encoding')] };
  }
  const { default: Papa } = await import('papaparse');
  return new Promise((resolve) => {
    const rows: RawStructuredImportRow[] = [];
    const issues: ImportIssue[] = [];
    let logicalRowNumber = 0;
    let delimiter: ',' | ';' | undefined;
    let abortedForLimit = false;

    Papa.parse<string[]>(file, {
      delimiter: '',
      delimitersToGuess: [',', ';'],
      dynamicTyping: false,
      skipEmptyLines: false,
      step: (stepResult, parser) => {
        logicalRowNumber += 1;
        if (!delimiter && (stepResult.meta.delimiter === ',' || stepResult.meta.delimiter === ';')) {
          delimiter = stepResult.meta.delimiter;
        }
        const cells = stepResult.data.map((cell) => String(cell));
        if (isEmptyRow(cells)) return;

        for (const error of stepResult.errors) {
          if (error.code === 'MissingQuotes' || error.code === 'InvalidQuotes') {
            issues.push(createImportIssue('invalid_csv_syntax', 'error', { rowNumber: logicalRowNumber }));
          } else if (error.code === 'TooManyFields' || error.code === 'TooFewFields') {
            issues.push(createImportIssue('row_column_count', 'error', { rowNumber: logicalRowNumber }));
          }
        }
        rows.push({ rowNumber: logicalRowNumber, cells });
        if (rows.length > STRUCTURED_IMPORT_LIMITS.dataRows + 1) {
          rows.pop();
          abortedForLimit = true;
          parser.abort();
        }
      },
      complete: () => {
        if (abortedForLimit) issues.push(createImportIssue('row_limit_exceeded'));
        const effectiveDelimiter = delimiter ?? ',';
        const alternate = effectiveDelimiter === ',' ? ';' : ',';
        const mixedDelimiter = rows.some((row) => (
          row.cells.length === 1
          && typeof row.cells[0] === 'string'
          && row.cells[0].split(alternate).length === STRUCTURED_IMPORT_LIMITS.columns
        ));
        if (mixedDelimiter) issues.push(createImportIssue('mixed_csv_delimiter'));
        resolve({
          sheetName: 'CSV',
          rows,
          csvDelimiter: effectiveDelimiter,
          issues,
        });
      },
      error: () => resolve({
        sheetName: 'CSV',
        rows: [],
        issues: [createImportIssue('header_missing')],
      }),
    });
  });
}

const ZIP_END_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP64_SENTINEL_16 = 0xffff;
const ZIP64_SENTINEL_32 = 0xffffffff;

type XlsxPreflightResult = { ok: true } | { ok: false; code: 'invalid_xlsx_container' | 'xlsx_resource_limit' };

export function preflightXlsxContainer(bytes: Uint8Array): XlsxPreflightResult {
  if (bytes.byteLength < 22) return { ok: false, code: 'invalid_xlsx_container' };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.byteLength - 65_557);
  let endOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_END_SIGNATURE) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) return { ok: false, code: 'invalid_xlsx_container' };

  const diskNumber = view.getUint16(endOffset + 4, true);
  const centralDisk = view.getUint16(endOffset + 6, true);
  const diskEntries = view.getUint16(endOffset + 8, true);
  const totalEntries = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const commentLength = view.getUint16(endOffset + 20, true);
  if (endOffset + 22 + commentLength !== bytes.byteLength || diskNumber !== 0 || centralDisk !== 0) {
    return { ok: false, code: 'invalid_xlsx_container' };
  }
  if (
    diskEntries === ZIP64_SENTINEL_16
    || totalEntries === ZIP64_SENTINEL_16
    || centralSize === ZIP64_SENTINEL_32
    || centralOffset === ZIP64_SENTINEL_32
  ) {
    return { ok: false, code: 'xlsx_resource_limit' };
  }
  if (diskEntries !== totalEntries || totalEntries > STRUCTURED_IMPORT_LIMITS.xlsxEntries) {
    return { ok: false, code: 'xlsx_resource_limit' };
  }
  if (centralOffset + centralSize !== endOffset || centralOffset > bytes.byteLength) {
    return { ok: false, code: 'invalid_xlsx_container' };
  }

  let offset = centralOffset;
  let expandedTotal = 0;
  for (let entry = 0; entry < totalEntries; entry += 1) {
    if (offset + 46 > endOffset || view.getUint32(offset, true) !== ZIP_CENTRAL_SIGNATURE) {
      return { ok: false, code: 'invalid_xlsx_container' };
    }
    const flags = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const expandedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const entryCommentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (
      (flags & 0x0001) !== 0
      || compressedSize === ZIP64_SENTINEL_32
      || expandedSize === ZIP64_SENTINEL_32
      || localOffset === ZIP64_SENTINEL_32
    ) {
      return { ok: false, code: 'xlsx_resource_limit' };
    }
    expandedTotal += expandedSize;
    if (
      expandedSize > STRUCTURED_IMPORT_LIMITS.xlsxExpandedBytes
      || expandedTotal > STRUCTURED_IMPORT_LIMITS.xlsxExpandedBytes
    ) {
      return { ok: false, code: 'xlsx_resource_limit' };
    }
    offset += 46 + nameLength + extraLength + entryCommentLength;
  }
  return offset === endOffset ? { ok: true } : { ok: false, code: 'invalid_xlsx_container' };
}

function excelCellValue(value: ExcelJS.CellValue): RawImportCell {
  if (value == null) return undefined;
  if (value instanceof Date || typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) return { kind: 'formula' } satisfies FormulaImportCell;
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('text' in value && typeof value.text === 'string') return value.text;
  }
  return String(value);
}

function columnName(column: number): (typeof STRUCTURED_IMPORT_HEADERS)[number] | undefined {
  return STRUCTURED_IMPORT_HEADERS[column - 1];
}

async function parseXlsx(file: File): Promise<ParsedLocalSpreadsheet | { issues: ImportIssue[] }> {
  const buffer = await file.arrayBuffer();
  const preflight = preflightXlsxContainer(new Uint8Array(buffer));
  if ('code' in preflight) return { issues: [createImportIssue(preflight.code)] };

  try {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return { issues: [createImportIssue('worksheet_missing')] };

    const issues: ImportIssue[] = [];
    if (workbook.worksheets.length > 1) {
      issues.push(createImportIssue('additional_worksheets_ignored', 'warning'));
    }
    if (worksheet.state !== 'visible') issues.push(createImportIssue('hidden_first_worksheet', 'warning'));

    const rows: RawStructuredImportRow[] = [];
    let rowLimitExceeded = false;
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const lastColumn = row.cellCount;
      const cells: RawImportCell[] = [];
      for (let column = 1; column <= lastColumn; column += 1) {
        cells.push(excelCellValue(row.getCell(column).value));
      }
      if (isEmptyRow(cells)) return;
      if (rows.length >= STRUCTURED_IMPORT_LIMITS.dataRows + 1) {
        rowLimitExceeded = true;
        return;
      }
      const mergedColumns = STRUCTURED_IMPORT_HEADERS.flatMap((column, index) => (
        row.getCell(index + 1).isMerged ? [column] : []
      ));
      rows.push({ rowNumber, cells, mergedColumns });
    });
    if (rowLimitExceeded) issues.push(createImportIssue('row_limit_exceeded'));
    return { sheetName: worksheet.name, rows, issues };
  } catch {
    return { issues: [createImportIssue('invalid_xlsx_container')] };
  }
}

function legacyCellText(cell: RawImportCell): string {
  if (cell == null) return '';
  if (cell instanceof Date) return cell.toISOString();
  if (typeof cell === 'object') return '';
  return String(cell);
}

/**
 * Temporary compatibility adapter for the pre-M3 wizard. File I/O remains in
 * the data layer while that UI still consumes generic raw rows.
 */
export async function readRawSpreadsheetFileForLegacyFlow(file: File): Promise<RawSpreadsheetFile> {
  if (!isSupportedStructuredImportFile(file.name)) throw new Error('unsupported_file_type');
  const lowerName = file.name.toLowerCase();
  if (
    (lowerName.endsWith('.csv') && file.size > STRUCTURED_IMPORT_LIMITS.csvBytes)
    || (lowerName.endsWith('.xlsx') && file.size > STRUCTURED_IMPORT_LIMITS.xlsxBytes)
  ) {
    throw new Error('file_too_large');
  }
  let parsed: ParsedLocalSpreadsheet;
  if (lowerName.endsWith('.csv')) {
    parsed = await parseCsvIncrementally(file);
  } else {
    const xlsx = await parseXlsx(file);
    if (!('rows' in xlsx)) throw new Error(xlsx.issues[0]?.code ?? 'invalid_xlsx_container');
    parsed = xlsx;
  }
  const blockingIssue = parsed.issues.find((issue) => issue.severity === 'error');
  if (blockingIssue) throw new Error(blockingIssue.code);
  return {
    sheetName: parsed.sheetName,
    rawRows: parsed.rows.map((row) => row.cells.map((cell) => legacyCellText(cell).trim())),
  };
}

export async function readLocalSpreadsheetFile(file: File): Promise<LocalSpreadsheetReadResult> {
  if (!isSupportedStructuredImportFile(file.name)) return rejected('unsupported_file_type');

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv') && file.size > STRUCTURED_IMPORT_LIMITS.csvBytes) {
    return rejected('file_too_large');
  }
  if (lowerName.endsWith('.xlsx') && file.size > STRUCTURED_IMPORT_LIMITS.xlsxBytes) {
    return rejected('file_too_large');
  }

  let parsed: ParsedLocalSpreadsheet;
  if (lowerName.endsWith('.csv')) {
    parsed = await parseCsvIncrementally(file);
  } else {
    const xlsx = await parseXlsx(file);
    if (!('rows' in xlsx)) return { kind: 'rejected', issues: xlsx.issues };
    parsed = xlsx;
  }

  return {
    kind: 'parsed',
    sourceKind: lowerName.endsWith('.csv') ? 'structured-csv' : 'structured-xlsx',
    spreadsheet: parsed,
  };
}
