import type ExcelJS from 'exceljs';
import { STRUCTURED_IMPORT_LIMITS } from '../../domain/import';
import {
  IMPORT_V2_PROFILE_LIMITS,
  type ProfileCellValue,
  type ProfileRowInput,
  type ResolvedImportV2Mapping,
} from '../../domain/import/v2';
import {
  isSupportedStructuredImportFile,
  preflightXlsxContainer,
} from './spreadsheetFileReader';

export type ImportV2MappedFileReadErrorCode =
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'invalid_csv_encoding'
  | 'invalid_csv_syntax'
  | 'mixed_csv_delimiter'
  | 'invalid_xlsx_container'
  | 'xlsx_resource_limit'
  | 'worksheet_missing'
  | 'worksheet_limit_exceeded'
  | 'row_limit_exceeded'
  | 'column_limit_exceeded'
  | 'sheet_mapping_mismatch';

export class ImportV2MappedFileReadError extends Error {
  constructor(public readonly code: ImportV2MappedFileReadErrorCode) {
    super(code);
    this.name = 'ImportV2MappedFileReadError';
  }
}

export interface ImportV2MappedSheetReadResult {
  sourceKind: 'structured-csv' | 'structured-xlsx';
  rows: ProfileRowInput[];
  csvDelimiter?: ',' | ';';
}

const MAX_NON_EMPTY_ROWS = STRUCTURED_IMPORT_LIMITS.dataRows + 1;

function fail(code: ImportV2MappedFileReadErrorCode): never {
  throw new ImportV2MappedFileReadError(code);
}

function isEmptyRow(cells: ProfileCellValue[]): boolean {
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

async function readCsv(file: File, mapping: ResolvedImportV2Mapping): Promise<ImportV2MappedSheetReadResult> {
  if (mapping.sheetIndex !== 0 || mapping.sheetId !== 'sheet-1') fail('sheet_mapping_mismatch');
  if (!(await isValidUtf8(file))) fail('invalid_csv_encoding');

  const { default: Papa } = await import('papaparse');
  return new Promise((resolve, reject) => {
    const rows: ProfileRowInput[] = [];
    let logicalRowNumber = 0;
    let delimiter: ',' | ';' | undefined;
    let sawPrimaryDelimitedRow = false;
    let sawAlternateDelimitedRow = false;
    let failure: ImportV2MappedFileReadErrorCode | undefined;

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
        if (stepResult.errors.some(({ code }) => code === 'MissingQuotes' || code === 'InvalidQuotes')) {
          failure = 'invalid_csv_syntax';
          parser.abort();
          return;
        }
        const cells = stepResult.data.map((cell) => String(cell));
        if (isEmptyRow(cells)) return;
        if (cells.length > IMPORT_V2_PROFILE_LIMITS.columns) {
          failure = 'column_limit_exceeded';
          parser.abort();
          return;
        }
        if (rows.length >= MAX_NON_EMPTY_ROWS) {
          failure = 'row_limit_exceeded';
          parser.abort();
          return;
        }
        if (delimiter) {
          const alternate = delimiter === ',' ? ';' : ',';
          if (cells.length > 1) sawPrimaryDelimitedRow = true;
          if (cells.length === 1 && cells[0]?.includes(alternate) && cells[0].split(alternate).length > 1) {
            sawAlternateDelimitedRow = true;
          }
        }
        rows.push({ rowNumber: logicalRowNumber, cells });
      },
      complete: () => {
        if (failure) {
          reject(new ImportV2MappedFileReadError(failure));
          return;
        }
        if (sawPrimaryDelimitedRow && sawAlternateDelimitedRow) {
          reject(new ImportV2MappedFileReadError('mixed_csv_delimiter'));
          return;
        }
        resolve({ sourceKind: 'structured-csv', rows, csvDelimiter: delimiter ?? ',' });
      },
      error: () => reject(new ImportV2MappedFileReadError('invalid_csv_syntax')),
    });
  });
}

function excelCellValue(value: ExcelJS.CellValue): ProfileCellValue {
  if (value == null) return undefined;
  if (value instanceof Date || typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) return { kind: 'formula' };
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('');
    if ('text' in value && typeof value.text === 'string') return value.text;
  }
  return String(value);
}

async function readXlsx(file: File, mapping: ResolvedImportV2Mapping): Promise<ImportV2MappedSheetReadResult> {
  const buffer = await file.arrayBuffer();
  const preflight = preflightXlsxContainer(new Uint8Array(buffer));
  if ('code' in preflight) fail(preflight.code);

  try {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    if (workbook.worksheets.length === 0) fail('worksheet_missing');
    if (workbook.worksheets.length > IMPORT_V2_PROFILE_LIMITS.worksheets) fail('worksheet_limit_exceeded');
    const worksheet = workbook.worksheets[mapping.sheetIndex];
    if (!worksheet || `sheet-${mapping.sheetIndex + 1}` !== mapping.sheetId || worksheet.name !== mapping.sheetName) {
      fail('sheet_mapping_mismatch');
    }

    const rows: ProfileRowInput[] = [];
    let failure: ImportV2MappedFileReadErrorCode | undefined;
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (failure) return;
      if (row.cellCount > IMPORT_V2_PROFILE_LIMITS.columns) {
        failure = 'column_limit_exceeded';
        return;
      }
      const cells: ProfileCellValue[] = [];
      const mergedColumnIndexes: number[] = [];
      for (let column = 1; column <= row.cellCount; column += 1) {
        const cell = row.getCell(column);
        cells.push(excelCellValue(cell.value));
        if (cell.isMerged) mergedColumnIndexes.push(column - 1);
      }
      if (isEmptyRow(cells)) return;
      if (rows.length >= MAX_NON_EMPTY_ROWS) {
        failure = 'row_limit_exceeded';
        return;
      }
      rows.push({
        rowNumber,
        cells,
        ...(mergedColumnIndexes.length > 0 ? { mergedColumnIndexes } : {}),
      });
    });
    if (failure) fail(failure);
    return { sourceKind: 'structured-xlsx', rows };
  } catch (error) {
    if (error instanceof ImportV2MappedFileReadError) throw error;
    fail('invalid_xlsx_container');
  }
}

export async function readImportV2MappedSheet(
  file: File,
  mapping: ResolvedImportV2Mapping,
): Promise<ImportV2MappedSheetReadResult> {
  if (!isSupportedStructuredImportFile(file.name)) fail('unsupported_file_type');
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv') && file.size > STRUCTURED_IMPORT_LIMITS.csvBytes) fail('file_too_large');
  if (lowerName.endsWith('.xlsx') && file.size > STRUCTURED_IMPORT_LIMITS.xlsxBytes) fail('file_too_large');
  return lowerName.endsWith('.csv') ? readCsv(file, mapping) : readXlsx(file, mapping);
}
