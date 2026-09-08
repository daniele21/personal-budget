export const IMPORT_V2_PROFILE_LIMITS = {
  worksheets: 12,
  columns: 64,
  sampledRowsPerSheet: 64,
  headerSearchRows: 12,
  headerCandidates: 4,
  samplesPerColumn: 8,
  sampleCodePoints: 160,
} as const;

export type ImportV2DateParserId =
  | 'iso-date'
  | 'dmy-slash'
  | 'dmy-dash'
  | 'excel-date';

export type ImportV2AmountStrategy =
  | 'signed-negative-expense'
  | 'signed-positive-expense'
  | 'debit-credit'
  | 'amount-direction';

export interface FormulaProfileCell {
  kind: 'formula';
}

export type ProfileCellValue = string | number | Date | FormulaProfileCell | undefined;

export interface ProfileRowInput {
  rowNumber: number;
  cells: ProfileCellValue[];
  mergedColumnIndexes?: number[];
}

export interface ProfileSheetInput {
  id: string;
  name: string;
  state: 'visible' | 'hidden' | 'veryHidden';
  rows: ProfileRowInput[];
  totalNonEmptyRows: number;
  samplesTruncated: boolean;
}

export interface ProfileWorkbookInput {
  sourceKind: 'csv' | 'xlsx';
  csvDelimiter?: ',' | ';';
  sheets: ProfileSheetInput[];
}

export interface ColumnProfile {
  id: string;
  columnIndex: number;
  header: string;
  nonEmptyCount: number;
  nonEmptyRatio: number;
  textRatio: number;
  numericRatio: number;
  dateLikeRatio: number;
  positiveNumericRatio: number;
  negativeNumericRatio: number;
  formulaCount: number;
  mergedCellCount: number;
  directionRatio: number;
  dateParsers: ImportV2DateParserId[];
  samples: string[];
}

export interface DateCandidate {
  id: string;
  columnId: string;
  parser: ImportV2DateParserId;
}

export interface SignedAmountCandidate {
  id: string;
  strategy: 'signed-negative-expense' | 'signed-positive-expense';
  columnId: string;
}

export interface DebitCreditAmountCandidate {
  id: string;
  strategy: 'debit-credit';
  debitColumnId: string;
  creditColumnId: string;
}

export interface AmountDirectionCandidate {
  id: string;
  strategy: 'amount-direction';
  amountColumnId: string;
  directionColumnId: string;
  directionMapId: 'debit-credit-v1';
}

export type AmountCandidate =
  | SignedAmountCandidate
  | DebitCreditAmountCandidate
  | AmountDirectionCandidate;

export interface HeaderCandidate {
  id: string;
  rowNumber: number;
  score: number;
  columns: ColumnProfile[];
  dateCandidates: DateCandidate[];
  amountCandidates: AmountCandidate[];
  descriptionCandidateColumnIds: string[];
}

export interface SheetProfile {
  id: string;
  name: string;
  state: ProfileSheetInput['state'];
  totalNonEmptyRows: number;
  samplesTruncated: boolean;
  headerCandidates: HeaderCandidate[];
}

export interface SpreadsheetProfile {
  sourceKind: ProfileWorkbookInput['sourceKind'];
  csvDelimiter?: ',' | ';';
  sheets: SheetProfile[];
}

type CellKind = 'empty' | 'text' | 'numeric' | 'date' | 'formula';

type CellAnalysis = {
  kind: CellKind;
  text: string;
  numeric?: number;
  dateParser?: ImportV2DateParserId;
  direction: boolean;
};

const DEBIT_HEADER = /\b(debit|debit amount|dare|addebiti?|spese?|uscite?)\b/i;
const CREDIT_HEADER = /\b(credit|avere|accrediti?|entrate?)\b/i;
const AMOUNT_HEADER = /\b(amount|importo|value|valore|movimento)\b/i;
const CURRENCY_HEADER = /\b(currency|valuta|divisa)\b/i;
const DIRECTION_HEADER = /\b(direction|type|tipo|segno|movimento)\b/i;
const DIRECTION_VALUE = /^(debit|credit|expense|income|spesa|entrata|uscita|addebito|accredito|dare|avere)$/i;

function roundRatio(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function clampSample(value: string): string {
  return Array.from(value.trim()).slice(0, IMPORT_V2_PROFILE_LIMITS.sampleCodePoints).join('');
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function stringDateParser(value: string): ImportV2DateParserId | undefined {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso && isValidCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))) return 'iso-date';

  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (slash && isValidCalendarDate(Number(slash[3]), Number(slash[2]), Number(slash[1]))) return 'dmy-slash';

  const dash = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (dash && isValidCalendarDate(Number(dash[3]), Number(dash[2]), Number(dash[1]))) return 'dmy-dash';

  return undefined;
}

function stringNumber(value: string): number | undefined {
  const compact = value.trim().replace(/[\s']/g, '');
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
    normalized = decimals >= 1 && decimals <= 2
      ? compact.replace(',', '.')
      : compact.split(',').join('');
  } else if (dotIndex >= 0) {
    const decimals = compact.length - dotIndex - 1;
    normalized = decimals >= 1 && decimals <= 2
      ? compact
      : compact.split('.').join('');
  }

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function analyzeCell(value: ProfileCellValue): CellAnalysis {
  if (value == null) return { kind: 'empty', text: '', direction: false };
  if (typeof value === 'object' && !(value instanceof Date)) {
    return { kind: 'formula', text: '', direction: false };
  }
  if (value instanceof Date) {
    return {
      kind: 'date',
      text: value.toISOString().slice(0, 10),
      dateParser: 'excel-date',
      direction: false,
    };
  }
  if (typeof value === 'number') {
    return { kind: 'numeric', text: String(value), numeric: value, direction: false };
  }

  const text = value.trim();
  if (!text) return { kind: 'empty', text: '', direction: false };
  const dateParser = stringDateParser(text);
  if (dateParser) return { kind: 'date', text, dateParser, direction: false };
  const numeric = stringNumber(text);
  if (numeric != null) return { kind: 'numeric', text, numeric, direction: false };
  return { kind: 'text', text, direction: DIRECTION_VALUE.test(text) };
}

function isHeaderLike(row: ProfileRowInput): boolean {
  const analyses = row.cells.map(analyzeCell);
  const nonEmpty = analyses.filter(({ kind }) => kind !== 'empty');
  if (nonEmpty.length < 2) return false;
  const textCount = nonEmpty.filter(({ kind }) => kind === 'text').length;
  const formulaCount = nonEmpty.filter(({ kind }) => kind === 'formula').length;
  return formulaCount === 0 && textCount / nonEmpty.length >= 0.75;
}

function dataSupportScore(rows: ProfileRowInput[], headerIndex: number): number {
  const candidates = rows.slice(headerIndex + 1, headerIndex + 4);
  if (candidates.length === 0) return 0;
  const informative = candidates.filter((row) =>
    row.cells.some((cell) => {
      const kind = analyzeCell(cell).kind;
      return kind === 'numeric' || kind === 'date';
    }),
  ).length;
  return informative / candidates.length;
}

function profileColumns(sheetId: string, header: ProfileRowInput, dataRows: ProfileRowInput[]): ColumnProfile[] {
  const columnCount = Math.max(header.cells.length, ...dataRows.map(({ cells }) => cells.length), 0);
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const analyses = dataRows.map((row) => analyzeCell(row.cells[columnIndex]));
    const nonEmpty = analyses.filter(({ kind }) => kind !== 'empty');
    const denominator = nonEmpty.length || 1;
    const numeric = nonEmpty.filter(({ kind }) => kind === 'numeric');
    const dates = nonEmpty.filter(({ kind }) => kind === 'date');
    const text = nonEmpty.filter(({ kind }) => kind === 'text');
    const dateParsers = Array.from(
      new Set(dates.flatMap(({ dateParser }) => (dateParser ? [dateParser] : []))),
    );
    const samples = Array.from(
      new Set(nonEmpty.map(({ text: sample }) => clampSample(sample)).filter(Boolean)),
    ).slice(0, IMPORT_V2_PROFILE_LIMITS.samplesPerColumn);
    const mergedCellCount = dataRows.filter((row) => row.mergedColumnIndexes?.includes(columnIndex)).length
      + (header.mergedColumnIndexes?.includes(columnIndex) ? 1 : 0);

    return {
      id: `${sheetId}-h${header.rowNumber}-c${columnIndex + 1}`,
      columnIndex,
      header: clampSample(analyzeCell(header.cells[columnIndex]).text),
      nonEmptyCount: nonEmpty.length,
      nonEmptyRatio: roundRatio(nonEmpty.length / Math.max(dataRows.length, 1)),
      textRatio: roundRatio(text.length / denominator),
      numericRatio: roundRatio(numeric.length / denominator),
      dateLikeRatio: roundRatio(dates.length / denominator),
      positiveNumericRatio: roundRatio(
        numeric.filter(({ numeric: numericValue }) => (numericValue ?? 0) > 0).length / denominator,
      ),
      negativeNumericRatio: roundRatio(
        numeric.filter(({ numeric: numericValue }) => (numericValue ?? 0) < 0).length / denominator,
      ),
      formulaCount: nonEmpty.filter(({ kind }) => kind === 'formula').length,
      mergedCellCount,
      directionRatio: roundRatio(text.filter(({ direction }) => direction).length / denominator),
      dateParsers,
      samples,
    };
  });
}

function isSafeCandidateColumn(column: ColumnProfile): boolean {
  return column.formulaCount === 0 && column.mergedCellCount === 0;
}

function dateCandidates(columns: ColumnProfile[]): DateCandidate[] {
  return columns.flatMap((column) => {
    if (!isSafeCandidateColumn(column) || column.dateLikeRatio < 0.6 || column.nonEmptyCount === 0) return [];
    return column.dateParsers.map((parser) => ({
      id: `${column.id}:date:${parser}`,
      columnId: column.id,
      parser,
    }));
  });
}

function amountCandidates(columns: ColumnProfile[]): AmountCandidate[] {
  const result: AmountCandidate[] = [];
  const numeric = columns.filter(
    (column) => isSafeCandidateColumn(column) && column.numericRatio >= 0.6 && column.nonEmptyCount > 0,
  );

  for (const column of numeric) {
    result.push({
      id: `${column.id}:amount:signed-negative-expense`,
      strategy: 'signed-negative-expense',
      columnId: column.id,
    });

    if (
      column.negativeNumericRatio === 0
      && column.positiveNumericRatio >= 0.6
      && DEBIT_HEADER.test(column.header)
    ) {
      result.push({
        id: `${column.id}:amount:signed-positive-expense`,
        strategy: 'signed-positive-expense',
        columnId: column.id,
      });
    }
  }

  const debits = numeric.filter((column) => DEBIT_HEADER.test(column.header));
  const credits = numeric.filter((column) => CREDIT_HEADER.test(column.header));
  for (const debit of debits) {
    for (const credit of credits) {
      if (debit.id === credit.id) continue;
      result.push({
        id: `${debit.id}+${credit.id}:amount:debit-credit`,
        strategy: 'debit-credit',
        debitColumnId: debit.id,
        creditColumnId: credit.id,
      });
    }
  }

  const directions = columns.filter(
    (column) => isSafeCandidateColumn(column)
      && (column.directionRatio >= 0.6 || DIRECTION_HEADER.test(column.header)),
  );
  const amounts = numeric.filter((column) => AMOUNT_HEADER.test(column.header));
  for (const amount of amounts) {
    for (const direction of directions) {
      result.push({
        id: `${amount.id}+${direction.id}:amount:amount-direction`,
        strategy: 'amount-direction',
        amountColumnId: amount.id,
        directionColumnId: direction.id,
        directionMapId: 'debit-credit-v1',
      });
    }
  }

  return result;
}

function descriptionCandidates(columns: ColumnProfile[]): string[] {
  return columns
    .filter((column) =>
      isSafeCandidateColumn(column)
      && column.textRatio >= 0.6
      && column.directionRatio < 0.6
      && !DIRECTION_HEADER.test(column.header)
      && !CURRENCY_HEADER.test(column.header)
      && !/^[A-Z]{3}$/i.test(column.samples[0] ?? ''),
    )
    .map(({ id }) => id);
}

function profileSheet(sheet: ProfileSheetInput): SheetProfile {
  const searchableRows = sheet.rows.slice(0, IMPORT_V2_PROFILE_LIMITS.headerSearchRows);
  const ranked = searchableRows
    .map((row, index) => ({
      row,
      index,
      score: isHeaderLike(row) ? 1 + dataSupportScore(sheet.rows, index) : 0,
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.row.rowNumber - right.row.rowNumber)
    .slice(0, IMPORT_V2_PROFILE_LIMITS.headerCandidates);

  const headerCandidates = ranked.map(({ row, score }) => {
    const dataRows = sheet.rows.filter(({ rowNumber }) => rowNumber > row.rowNumber);
    const columns = profileColumns(sheet.id, row, dataRows);
    return {
      id: `${sheet.id}-h${row.rowNumber}`,
      rowNumber: row.rowNumber,
      score: roundRatio(score),
      columns,
      dateCandidates: dateCandidates(columns),
      amountCandidates: amountCandidates(columns),
      descriptionCandidateColumnIds: descriptionCandidates(columns),
    } satisfies HeaderCandidate;
  });

  return {
    id: sheet.id,
    name: sheet.name,
    state: sheet.state,
    totalNonEmptyRows: sheet.totalNonEmptyRows,
    samplesTruncated: sheet.samplesTruncated,
    headerCandidates,
  };
}

export function profileSpreadsheet(input: ProfileWorkbookInput): SpreadsheetProfile {
  return {
    sourceKind: input.sourceKind,
    ...(input.csvDelimiter ? { csvDelimiter: input.csvDelimiter } : {}),
    sheets: input.sheets.map(profileSheet),
  };
}
