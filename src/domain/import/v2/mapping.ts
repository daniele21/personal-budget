import { validateStructuredImport } from '../structuredImportValidation';
import type {
  FormulaImportCell,
  RawImportCell,
  RawStructuredImportRow,
  StructuredImportValidationResult,
} from '../structuredImportTypes';
import type {
  AmountCandidate,
  HeaderCandidate,
  ImportV2DateParserId,
  ProfileSheetInput,
  SpreadsheetProfile,
} from './profile';

export interface ImportV2MappingSelection {
  dateCandidateId: string;
  amountCandidateId: string;
  descriptionColumnIds: readonly string[];
  typeColumnId?: string | null;
}

export type ImportV2MappingErrorCode =
  | 'incomplete_mapping'
  | 'unknown_candidate_id'
  | 'duplicate_description_column'
  | 'mixed_header_mapping'
  | 'unsupported_type_mapping'
  | 'unsupported_currency';

export class ImportV2MappingError extends Error {
  constructor(public readonly code: ImportV2MappingErrorCode) {
    super(code);
    this.name = 'ImportV2MappingError';
  }
}

export interface ResolvedImportV2Mapping {
  sheetId: string;
  sheetName: string;
  sheetIndex: number;
  headerCandidateId: string;
  headerRowNumber: number;
  date: {
    columnIndex: number;
    parser: ImportV2DateParserId;
  };
  descriptionColumnIndexes: readonly number[];
  amount:
    | { strategy: 'signed-negative-expense'; columnIndex: number }
    | { strategy: 'signed-positive-expense'; columnIndex: number }
    | { strategy: 'debit-credit'; debitColumnIndex: number; creditColumnIndex: number }
    | {
        strategy: 'amount-direction';
        amountColumnIndex: number;
        directionColumnIndex: number;
        directionMapId: 'debit-credit-v1';
      };
  currencyColumnIndexes: readonly number[];
}

function candidateOwner(
  profile: SpreadsheetProfile,
  predicate: (header: HeaderCandidate) => boolean,
): Array<{ sheetIndex: number; sheetId: string; sheetName: string; header: HeaderCandidate }> {
  return profile.sheets.flatMap((sheet, sheetIndex) =>
    sheet.headerCandidates
      .filter(predicate)
      .map((header) => ({ sheetIndex, sheetId: sheet.id, sheetName: sheet.name, header })),
  );
}

function singleOwner(
  profile: SpreadsheetProfile,
  predicate: (header: HeaderCandidate) => boolean,
): { sheetIndex: number; sheetId: string; sheetName: string; header: HeaderCandidate } {
  const matches = candidateOwner(profile, predicate);
  if (matches.length !== 1) throw new ImportV2MappingError('unknown_candidate_id');
  return matches[0]!;
}

function columnIndex(header: HeaderCandidate, columnId: string): number {
  const column = header.columns.find(({ id }) => id === columnId);
  if (!column) throw new ImportV2MappingError('unknown_candidate_id');
  return column.columnIndex;
}

function resolveAmount(header: HeaderCandidate, candidate: AmountCandidate): ResolvedImportV2Mapping['amount'] {
  switch (candidate.strategy) {
    case 'signed-negative-expense':
    case 'signed-positive-expense':
      return { strategy: candidate.strategy, columnIndex: columnIndex(header, candidate.columnId) };
    case 'debit-credit':
      return {
        strategy: candidate.strategy,
        debitColumnIndex: columnIndex(header, candidate.debitColumnId),
        creditColumnIndex: columnIndex(header, candidate.creditColumnId),
      };
    case 'amount-direction':
      return {
        strategy: candidate.strategy,
        amountColumnIndex: columnIndex(header, candidate.amountColumnId),
        directionColumnIndex: columnIndex(header, candidate.directionColumnId),
        directionMapId: candidate.directionMapId,
      };
  }
}

export function resolveImportV2Mapping(
  profile: SpreadsheetProfile,
  selection: ImportV2MappingSelection,
): ResolvedImportV2Mapping {
  if (!selection.dateCandidateId || !selection.amountCandidateId || selection.descriptionColumnIds.length === 0) {
    throw new ImportV2MappingError('incomplete_mapping');
  }
  if (new Set(selection.descriptionColumnIds).size !== selection.descriptionColumnIds.length) {
    throw new ImportV2MappingError('duplicate_description_column');
  }
  if (selection.typeColumnId) throw new ImportV2MappingError('unsupported_type_mapping');

  const dateOwner = singleOwner(
    profile,
    (header) => header.dateCandidates.some(({ id }) => id === selection.dateCandidateId),
  );
  const amountOwner = singleOwner(
    profile,
    (header) => header.amountCandidates.some(({ id }) => id === selection.amountCandidateId),
  );
  const sameHeader = dateOwner.sheetId === amountOwner.sheetId && dateOwner.header.id === amountOwner.header.id;
  if (!sameHeader) throw new ImportV2MappingError('mixed_header_mapping');

  const { header } = dateOwner;
  for (const descriptionId of selection.descriptionColumnIds) {
    if (!header.descriptionCandidateColumnIds.includes(descriptionId)) {
      const belongsElsewhere = candidateOwner(
        profile,
        (candidateHeader) => candidateHeader.descriptionCandidateColumnIds.includes(descriptionId),
      );
      throw new ImportV2MappingError(belongsElsewhere.length > 0 ? 'mixed_header_mapping' : 'unknown_candidate_id');
    }
  }

  const dateCandidate = header.dateCandidates.find(({ id }) => id === selection.dateCandidateId)!;
  const amountCandidate = header.amountCandidates.find(({ id }) => id === selection.amountCandidateId)!;
  const currencyColumnIndexes = header.columns
    .filter(({ header: label }) => /\b(currency|valuta|divisa)\b/i.test(label))
    .map(({ columnIndex: index }) => index);

  return {
    sheetId: dateOwner.sheetId,
    sheetName: dateOwner.sheetName,
    sheetIndex: dateOwner.sheetIndex,
    headerCandidateId: header.id,
    headerRowNumber: header.rowNumber,
    date: {
      columnIndex: columnIndex(header, dateCandidate.columnId),
      parser: dateCandidate.parser,
    },
    descriptionColumnIndexes: selection.descriptionColumnIds.map((id) => columnIndex(header, id)),
    amount: resolveAmount(header, amountCandidate),
    currencyColumnIndexes,
  };
}

function formula(): FormulaImportCell {
  return { kind: 'formula' };
}

function isFormula(value: RawImportCell): value is FormulaImportCell {
  return typeof value === 'object' && value !== null && !(value instanceof Date) && value.kind === 'formula';
}

function text(value: RawImportCell): string {
  if (value == null || isFormula(value)) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function parseNumber(value: RawImportCell): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (value == null || value instanceof Date || isFormula(value)) return undefined;
  const compact = String(value).trim().replace(/[\s']/g, '');
  if (!/^[+-]?[\d.,]+$/.test(compact)) return undefined;

  const commaIndex = compact.lastIndexOf(',');
  const dotIndex = compact.lastIndexOf('.');
  let normalized = compact;
  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = normalized.split(thousandsSeparator).join('');
    normalized = normalized.replace(decimalSeparator, '.');
  } else if (commaIndex >= 0) {
    const decimals = compact.length - commaIndex - 1;
    normalized = decimals >= 1 && decimals <= 2 ? compact.replace(',', '.') : compact.split(',').join('');
  } else if (dotIndex >= 0) {
    const decimals = compact.length - dotIndex - 1;
    normalized = decimals >= 1 && decimals <= 2 ? compact : compact.split('.').join('');
  }
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateValue(value: RawImportCell, parser: ImportV2DateParserId): RawImportCell {
  if (isFormula(value)) return formula();
  if (parser === 'excel-date') return value;
  const raw = text(value);
  if (!raw) return raw;
  if (parser === 'iso-date') return raw;
  const match = parser === 'dmy-slash'
    ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw)
    : /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : raw;
}

function descriptionValue(values: RawImportCell[]): RawImportCell {
  if (values.some(isFormula)) return formula();
  return values.map(text).filter(Boolean).join(' · ');
}

const EXPENSE_DIRECTIONS = new Set(['debit', 'expense', 'spesa', 'uscita', 'addebito', 'dare']);
const INCOME_DIRECTIONS = new Set(['credit', 'income', 'entrata', 'accredito', 'avere']);

function amountValue(row: ProfileSheetInput['rows'][number], mapping: ResolvedImportV2Mapping['amount']): RawImportCell {
  const cell = (index: number) => row.cells[index] as RawImportCell;
  switch (mapping.strategy) {
    case 'signed-negative-expense': {
      if (isFormula(cell(mapping.columnIndex))) return formula();
      const parsed = parseNumber(cell(mapping.columnIndex));
      return parsed ?? cell(mapping.columnIndex);
    }
    case 'signed-positive-expense': {
      if (isFormula(cell(mapping.columnIndex))) return formula();
      const parsed = parseNumber(cell(mapping.columnIndex));
      return parsed == null ? cell(mapping.columnIndex) : -Math.abs(parsed);
    }
    case 'debit-credit': {
      const debitCell = cell(mapping.debitColumnIndex);
      const creditCell = cell(mapping.creditColumnIndex);
      if (isFormula(debitCell) || isFormula(creditCell)) return formula();
      const debitText = text(debitCell);
      const creditText = text(creditCell);
      if (debitText && creditText) return Number.NaN;
      if (!debitText && !creditText) return '';
      const parsed = parseNumber(debitText ? debitCell : creditCell);
      if (parsed == null) return debitText ? debitCell : creditCell;
      return debitText ? -Math.abs(parsed) : Math.abs(parsed);
    }
    case 'amount-direction': {
      const amountCell = cell(mapping.amountColumnIndex);
      const directionCell = cell(mapping.directionColumnIndex);
      if (isFormula(amountCell) || isFormula(directionCell)) return formula();
      const parsed = parseNumber(amountCell);
      if (parsed == null) return amountCell;
      const direction = text(directionCell).toLowerCase();
      if (EXPENSE_DIRECTIONS.has(direction)) return -Math.abs(parsed);
      if (INCOME_DIRECTIONS.has(direction)) return Math.abs(parsed);
      return Number.NaN;
    }
  }
}

function selectedMergedColumns(
  row: ProfileSheetInput['rows'][number],
  mapping: ResolvedImportV2Mapping,
): Array<'date' | 'description' | 'amount'> {
  const merged = new Set(row.mergedColumnIndexes ?? []);
  const result: Array<'date' | 'description' | 'amount'> = [];
  if (merged.has(mapping.date.columnIndex)) result.push('date');
  if (mapping.descriptionColumnIndexes.some((index) => merged.has(index))) result.push('description');
  const amountIndexes = mapping.amount.strategy === 'debit-credit'
    ? [mapping.amount.debitColumnIndex, mapping.amount.creditColumnIndex]
    : mapping.amount.strategy === 'amount-direction'
      ? [mapping.amount.amountColumnIndex, mapping.amount.directionColumnIndex]
      : [mapping.amount.columnIndex];
  if (amountIndexes.some((index) => merged.has(index))) result.push('amount');
  return result;
}

function assertSupportedCurrency(rows: ProfileSheetInput['rows'], mapping: ResolvedImportV2Mapping): void {
  if (mapping.currencyColumnIndexes.length === 0) return;
  const allowed = new Set(['EUR', 'EURO', 'EUROS', '€']);
  for (const row of rows) {
    if (row.rowNumber <= mapping.headerRowNumber) continue;
    for (const index of mapping.currencyColumnIndexes) {
      const value = text(row.cells[index] as RawImportCell).toUpperCase();
      if (value && !allowed.has(value)) throw new ImportV2MappingError('unsupported_currency');
    }
  }
}

export interface ExtractImportV2Options {
  sourceKind: 'structured-csv' | 'structured-xlsx';
  csvDelimiter?: ',' | ';';
  today?: string;
}

export function extractImportV2Rows(
  rows: ProfileSheetInput['rows'],
  mapping: ResolvedImportV2Mapping,
  options: ExtractImportV2Options,
): StructuredImportValidationResult {
  assertSupportedCurrency(rows, mapping);
  const header = rows.find(({ rowNumber }) => rowNumber === mapping.headerRowNumber);
  if (!header) throw new ImportV2MappingError('unknown_candidate_id');

  const canonicalRows: RawStructuredImportRow[] = [
    { rowNumber: header.rowNumber, cells: ['date', 'description', 'amount'] },
    ...rows
      .filter(({ rowNumber }) => rowNumber > mapping.headerRowNumber)
      .map((row) => ({
        rowNumber: row.rowNumber,
        cells: [
          dateValue(row.cells[mapping.date.columnIndex] as RawImportCell, mapping.date.parser),
          descriptionValue(mapping.descriptionColumnIndexes.map((index) => row.cells[index] as RawImportCell)),
          amountValue(row, mapping.amount),
        ],
        mergedColumns: selectedMergedColumns(row, mapping),
      })),
  ];

  return validateStructuredImport({
    sourceKind: options.sourceKind,
    rows: canonicalRows,
    csvDelimiter: options.csvDelimiter,
    today: options.today,
  });
}
