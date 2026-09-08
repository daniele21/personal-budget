import type ExcelJS from 'exceljs';
import { STRUCTURED_IMPORT_LIMITS } from '../../domain/import';
import {
  IMPORT_V2_PROFILE_LIMITS,
  profileSpreadsheet,
  type ProfileCellValue,
  type ProfileRowInput,
  type ProfileSheetInput,
  type ProfileWorkbookInput,
  type SpreadsheetProfile,
} from '../../domain/import/v2';
import {
  isSupportedStructuredImportFile,
  preflightXlsxContainer,
} from './spreadsheetFileReader';

export type SpreadsheetProfileRejectReason =
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
  | 'column_limit_exceeded';

export type SpreadsheetProfileReadResult =
  | { kind: 'profiled'; profile: SpreadsheetProfile }
  | { kind: 'rejected'; reason: SpreadsheetProfileRejectReason };

const MAX_NON_EMPTY_ROWS = STRUCTURED_IMPORT_LIMITS.dataRows + 1;

function rejected(reason: SpreadsheetProfileRejectReason): SpreadsheetProfileReadResult {
  return { kind: 'rejected', reason };
}

function isEmptyProfileRow(cells: ProfileCellValue[]): boolean {
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

async function readCsvProfileInput(file: File): Promise<ProfileWorkbookInput | SpreadsheetProfileReadResult> {
  if (!(await isValidUtf8(file))) return rejected('invalid_csv_encoding');

  const { default: Papa } = await import('papaparse');
  return new Promise((resolve) => {
    const sampledRows: ProfileRowInput[] = [];
    let logicalRowNumber = 0;
    let totalNonEmptyRows = 0;
    let delimiter: ',' | ';' | undefined;
    let sawPrimaryDelimitedRow = false;
    let sawAlternateDelimitedRow = false;
    let failure: SpreadsheetProfileRejectReason | undefined;

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
        if (isEmptyProfileRow(cells)) return;
        totalNonEmptyRows += 1;

        if (totalNonEmptyRows > MAX_NON_EMPTY_ROWS) {
          failure = 'row_limit_exceeded';
          parser.abort();
          return;
        }
        if (cells.length > IMPORT_V2_PROFILE_LIMITS.columns) {
          failure = 'column_limit_exceeded';
          parser.abort();
          return;
        }

        if (delimiter) {
          const alternate = delimiter === ',' ? ';' : ',';
          if (cells.length > 1) sawPrimaryDelimitedRow = true;
          if (
            cells.length === 1
            && cells[0]?.includes(alternate)
            && cells[0].split(alternate).length > 1
          ) {
            sawAlternateDelimitedRow = true;
          }
        }

        if (sampledRows.length < IMPORT_V2_PROFILE_LIMITS.sampledRowsPerSheet) {
          sampledRows.push({ rowNumber: logicalRowNumber, cells });
        }
      },
      complete: () => {
        if (failure) {
          resolve(rejected(failure));
          return;
        }
        if (sawPrimaryDelimitedRow && sawAlternateDelimitedRow) {
          resolve(rejected('mixed_csv_delimiter'));
          return;
        }

        resolve({
          sourceKind: 'csv',
          csvDelimiter: delimiter ?? ',',
          sheets: [{
            id: 'sheet-1',
            name: 'CSV',
            state: 'visible',
            rows: sampledRows,
            totalNonEmptyRows,
            samplesTruncated: totalNonEmptyRows > sampledRows.length,
          }],
        });
      },
      error: () => resolve(rejected('invalid_csv_syntax')),
    });
  });
}

function excelProfileCellValue(value: ExcelJS.CellValue): ProfileCellValue {
  if (value == null) return undefined;
  if (value instanceof Date || typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) return { kind: 'formula' };
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('text' in value && typeof value.text === 'string') return value.text;
  }
  return String(value);
}

function profileWorksheet(worksheet: ExcelJS.Worksheet, sheetIndex: number): ProfileSheetInput | SpreadsheetProfileReadResult {
  const sampledRows: ProfileRowInput[] = [];
  let totalNonEmptyRows = 0;
  let failure: SpreadsheetProfileRejectReason | undefined;

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
      cells.push(excelProfileCellValue(cell.value));
      if (cell.isMerged) mergedColumnIndexes.push(column - 1);
    }
    if (isEmptyProfileRow(cells)) return;

    totalNonEmptyRows += 1;
    if (totalNonEmptyRows > MAX_NON_EMPTY_ROWS) {
      failure = 'row_limit_exceeded';
      return;
    }

    if (sampledRows.length < IMPORT_V2_PROFILE_LIMITS.sampledRowsPerSheet) {
      sampledRows.push({
        rowNumber,
        cells,
        ...(mergedColumnIndexes.length > 0 ? { mergedColumnIndexes } : {}),
      });
    }
  });

  if (failure) return rejected(failure);
  return {
    id: `sheet-${sheetIndex + 1}`,
    name: worksheet.name,
    state: worksheet.state,
    rows: sampledRows,
    totalNonEmptyRows,
    samplesTruncated: totalNonEmptyRows > sampledRows.length,
  };
}

async function readXlsxProfileInput(file: File): Promise<ProfileWorkbookInput | SpreadsheetProfileReadResult> {
  const buffer = await file.arrayBuffer();
  const preflight = preflightXlsxContainer(new Uint8Array(buffer));
  if ('code' in preflight) return rejected(preflight.code);

  try {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    if (workbook.worksheets.length === 0) return rejected('worksheet_missing');
    if (workbook.worksheets.length > IMPORT_V2_PROFILE_LIMITS.worksheets) {
      return rejected('worksheet_limit_exceeded');
    }

    const sheets: ProfileSheetInput[] = [];
    for (const [sheetIndex, worksheet] of workbook.worksheets.entries()) {
      const profiled = profileWorksheet(worksheet, sheetIndex);
      if ('kind' in profiled) return profiled;
      sheets.push(profiled);
    }
    return { sourceKind: 'xlsx', sheets };
  } catch {
    return rejected('invalid_xlsx_container');
  }
}

/**
 * Low-level W2 discovery reader. W6 orchestration must call it only after the
 * existing Aura archive/legacy classification order has been preserved.
 * This function never performs network, model, persistence or ledger work.
 */
export async function readSpreadsheetProfile(file: File): Promise<SpreadsheetProfileReadResult> {
  if (!isSupportedStructuredImportFile(file.name)) return rejected('unsupported_file_type');

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv') && file.size > STRUCTURED_IMPORT_LIMITS.csvBytes) {
    return rejected('file_too_large');
  }
  if (lowerName.endsWith('.xlsx') && file.size > STRUCTURED_IMPORT_LIMITS.xlsxBytes) {
    return rejected('file_too_large');
  }

  const input = lowerName.endsWith('.csv')
    ? await readCsvProfileInput(file)
    : await readXlsxProfileInput(file);
  if ('kind' in input) return input;
  return { kind: 'profiled', profile: profileSpreadsheet(input) };
}
