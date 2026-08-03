/**
 * Compatibility facade for the existing import wizard.
 * New structured imports use the typed reader in src/data/import directly.
 */
import {
  readRawSpreadsheetFileForLegacyFlow,
  isSupportedStructuredImportFile,
  SUPPORTED_STRUCTURED_IMPORT_EXTENSIONS,
} from '../data/import/spreadsheetFileReader';

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
 * This adapter can be removed when the deterministic wizard replaces the
 * remaining generic pre-M3 flow.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  return readRawSpreadsheetFileForLegacyFlow(file);
}

/**
 * Supported file extensions for import.
 */
export const SUPPORTED_EXTENSIONS = [...SUPPORTED_STRUCTURED_IMPORT_EXTENSIONS].reverse();

/**
 * Check if a filename has a supported extension.
 */
export function isSupportedFile(filename: string): boolean {
  return isSupportedStructuredImportFile(filename);
}
