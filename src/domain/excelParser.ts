/**
 * Excel file parser — extracts raw rows from .xlsx / .xls / .csv files.
 *
 * Uses the SheetJS (xlsx) library for client-side parsing.
 * Returns parsed rows as arrays of key-value objects using the first
 * row as header names.
 */
import * as XLSX from 'xlsx';

/** A single parsed row from the spreadsheet, keyed by column header */
export type SpreadsheetRow = Record<string, string | number | undefined>;

export interface ParsedSpreadsheet {
  /** The name of the sheet */
  sheetName: string;
  /** All non-empty rows, represented as arrays of strings */
  rawRows: string[][];
}

/**
 * Parse an Excel or CSV file from a browser File object.
 * Extracts all non-empty rows as a 2D array of strings.
 * We do not attempt to guess the header row locally, as the AI handles it better.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Il file non contiene fogli di lavoro.');
  }

  const sheet = workbook.Sheets[sheetName];
  
  // Get raw arrays of cells
  const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1, 
    defval: '',
    blankrows: false,
    raw: false,
  });

  // Filter out rows that are completely empty
  const cleanRows = rawData
    .filter(row => Array.isArray(row) && row.some(cell => String(cell).trim() !== ''))
    .map(row => row.map(cell => String(cell).trim()));

  if (cleanRows.length === 0) {
    throw new Error('Il foglio è vuoto o non contiene dati validi.');
  }

  return {
    sheetName,
    rawRows: cleanRows,
  };
}

/**
 * Supported file extensions for import.
 */
export const SUPPORTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

/**
 * Check if a filename has a supported extension.
 */
export function isSupportedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
