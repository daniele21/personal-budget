import { readLocalSpreadsheetFile } from '../../data/import/spreadsheetFileReader';
import { readSpreadsheetProfile } from '../../data/import/spreadsheetProfileReader';
import {
  validateStructuredImport,
  type ImportIssue,
  type RawImportCell,
  type RawStructuredImportRow,
  type StructuredImportValidationResult,
} from '../../domain/import';
import type { SpreadsheetProfile } from '../../domain/import/v2';
import {
  beginImportV2DiagnosticAttempt,
  recordImportV2Diagnostic,
} from '../../lib/importV2Diagnostics';
import { isAuraPortableArchive } from '../archive/archiveReader';

export type TransactionImportFileReadResult =
  | { kind: 'aura-archive' }
  | { kind: 'aura-legacy-csv'; rawRows: string[][] }
  | { kind: 'mapping-required'; profile: SpreadsheetProfile }
  | { kind: 'structured'; sheetName: string; validation: StructuredImportValidationResult }
  | { kind: 'rejected'; issues: ImportIssue[] };

export interface TransactionImportFileReaderOptions {
  today?: string;
}

const AURA_LEGACY_REQUIRED_HEADERS = [
  'amount',
  'type',
  'category',
  'date',
  'title',
  'description',
  'paymentmethod',
  'reportingclass',
] as const;

function cellText(cell: RawImportCell): string {
  if (cell == null) return '';
  if (cell instanceof Date) return cell.toISOString();
  if (typeof cell === 'object') return '';
  return String(cell);
}

const V2_PROFILE_TRIGGER_CODES = new Set<ImportIssue['code']>([
  'header_missing',
  'header_column_count',
  'header_duplicate',
  'header_unknown',
  'header_order',
]);

function shouldProfileImportV2(validation: StructuredImportValidationResult): boolean {
  return validation.issues.some((issue) =>
    issue.severity === 'error' && V2_PROFILE_TRIGGER_CODES.has(issue.code),
  );
}

function legacyRows(rows: RawStructuredImportRow[]): string[][] | null {
  const stringRows = rows.map((row) => row.cells.map(cellText));
  const header = stringRows.find((row) => {
    const normalized = row.map((cell) => cell.trim().toLowerCase());
    return AURA_LEGACY_REQUIRED_HEADERS.every((required) => normalized.includes(required));
  });
  return header ? stringRows : null;
}

function sourceKindHint(file: File): 'csv' | 'xlsx' | 'unknown' {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.csv')) return 'csv';
  if (lowerName.endsWith('.xlsx')) return 'xlsx';
  return 'unknown';
}

/**
 * Classifies archive, legacy Aura CSV and deterministic V1 content in that
 * order. Only a V1-blocked supported spreadsheet can continue into the local
 * V2 profiler; no persistence, network or provider operation is reachable here.
 */
export async function readTransactionImportFile(
  file: File,
  options: TransactionImportFileReaderOptions = {},
): Promise<TransactionImportFileReadResult> {
  const attemptId = beginImportV2DiagnosticAttempt(sourceKindHint(file));

  if (await isAuraPortableArchive(file)) {
    recordImportV2Diagnostic('file-route', 'aura-archive', {}, attemptId);
    return { kind: 'aura-archive' };
  }
  const local = await readLocalSpreadsheetFile(file);
  if (local.kind === 'rejected') {
    recordImportV2Diagnostic('file-route', 'rejected', {
      reasonCode: local.issues.map((issue) => issue.code).sort().join(','),
    }, attemptId);
    return local;
  }

  if (local.sourceKind === 'structured-csv') {
    const auraLegacyRows = legacyRows(local.spreadsheet.rows);
    if (auraLegacyRows) {
      recordImportV2Diagnostic('file-route', 'aura-legacy-csv', { sourceKind: 'csv' }, attemptId);
      return { kind: 'aura-legacy-csv', rawRows: auraLegacyRows };
    }
  }

  const validation = validateStructuredImport({
    sourceKind: local.sourceKind,
    rows: local.spreadsheet.rows,
    csvDelimiter: local.spreadsheet.csvDelimiter,
    initialIssues: local.spreadsheet.issues,
    today: options.today,
  });
  if (!validation.hasBlockingIssues || !shouldProfileImportV2(validation)) {
    recordImportV2Diagnostic('file-route', 'structured', {
      reasonCode: validation.hasBlockingIssues ? 'non-v2-blocking-issues' : 'v1-valid',
    }, attemptId);
    return { kind: 'structured', sheetName: local.spreadsheet.sheetName, validation };
  }

  const profiled = await readSpreadsheetProfile(file);
  if (profiled.kind === 'profiled') {
    recordImportV2Diagnostic('file-route', 'mapping-required', {
      sourceKind: profiled.profile.sourceKind,
    }, attemptId);
    return { kind: 'mapping-required', profile: profiled.profile };
  }

  recordImportV2Diagnostic('file-route', 'profile-rejected', {
    reasonCode: profiled.reason,
  }, attemptId);
  return {
    kind: 'structured',
    sheetName: local.spreadsheet.sheetName,
    validation,
  };
}
