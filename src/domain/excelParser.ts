/**
 * Spreadsheet file parser — extracts raw rows from .xlsx / .csv files.
 */
import type ExcelJS from 'exceljs';

/** A single parsed row from the spreadsheet, keyed by column header */
export type SpreadsheetRow = Record<string, string | number | undefined>;

export interface ParsedSpreadsheet {
  /** The name of the sheet */
  sheetName: string;
  /** All non-empty rows, represented as arrays of strings */
  rawRows: string[][];
}

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value) return cellValueToString(value.result as ExcelJS.CellValue);
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('hyperlink' in value && 'text' in value && typeof value.text === 'string') return value.text;
    return String(value);
  }
  return String(value);
}

function cleanRawRows(rawRows: string[][]): string[][] {
  return rawRows
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row) => row.map((cell) => cell.trim()));
}

async function parseCsvFile(file: File): Promise<ParsedSpreadsheet> {
  const { default: Papa } = await import('papaparse');
  const text = await file.text();
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV non valido: ${result.errors[0]?.message ?? 'errore di parsing'}.`);
  }

  const cleanRows = cleanRawRows(result.data.map((row) => row.map((cell) => String(cell))));
  if (cleanRows.length === 0) {
    throw new Error('Il file è vuoto o non contiene dati validi.');
  }

  return {
    sheetName: 'CSV',
    rawRows: cleanRows,
  };
}

async function parseXlsxFile(file: File): Promise<ParsedSpreadsheet> {
  const { default: ExcelJS } = await import('exceljs');
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Il file non contiene fogli di lavoro.');
  }

  const rawRows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    for (let column = 1; column <= sheet.actualColumnCount; column += 1) {
      values.push(cellValueToString(row.getCell(column).value));
    }
    rawRows.push(values);
  });

  const cleanRows = cleanRawRows(rawRows);
  if (cleanRows.length === 0) {
    throw new Error('Il foglio è vuoto o non contiene dati validi.');
  }

  return {
    sheetName: sheet.name,
    rawRows: cleanRows,
  };
}

/**
 * Parse an Excel or CSV file from a browser File object.
 * Extracts all non-empty rows as a 2D array of strings.
 * We do not attempt to guess the header row locally, as the AI handles it better.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv')) return parseCsvFile(file);
  if (lowerName.endsWith('.xlsx')) return parseXlsxFile(file);
  throw new Error(`Formato file non supportato. Carica uno di questi formati: ${SUPPORTED_EXTENSIONS.join(', ')}.`);
}

/**
 * Supported file extensions for import.
 */
export const SUPPORTED_EXTENSIONS = ['.xlsx', '.csv'];

/**
 * Check if a filename has a supported extension.
 */
export function isSupportedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
