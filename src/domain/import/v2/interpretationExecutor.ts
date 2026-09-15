import type { RawImportCell, StructuredImportValidationResult } from '../structuredImportTypes';
import { extractImportV2Rows, type ResolvedImportV2Mapping } from './mapping';
import {
  IMPORT_V2_INTERPRETATION_LIMITS,
  type ImportV2PreviewRow,
  type ImportV2RawCell,
  type ImportV2RawDocument,
  type ImportV2RawRow,
  type ImportV2TransformationPlan,
  validateImportV2TransformationPlan,
} from './interpretation';
import type { ProfileRowInput } from './profile';

export interface ImportV2InterpretationPreviewResult {
  preview: readonly ImportV2PreviewRow[];
  unresolvedSourceRowNumbers: readonly number[];
  validation: StructuredImportValidationResult;
}

function rawCellToMappingCell(value: ImportV2RawCell): RawImportCell {
  if (value == null || typeof value === 'string' || typeof value === 'number') return value;
  if (value.kind === 'formula') return { kind: 'formula' };
  return new Date(value.isoDate);
}

function rawCellText(value: ImportV2RawCell): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value.kind === 'date') return value.isoDate;
  return '';
}

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return value;
}

/** Parse one bounded logical record using CSV-style double-quote escaping. */
export function splitImportV2DelimitedRecord(value: string, delimiter: string): string[] | null {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!;
    if (char === '"') {
      if (quoted && value[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (quoted) return null;
  cells.push(current);
  return cells;
}

function logicalCells(
  row: ImportV2RawRow,
  plan: ImportV2TransformationPlan,
): RawImportCell[] | null {
  if (plan.layout.kind === 'grid') {
    return row.cells.map(rawCellToMappingCell);
  }

  const source = rawCellText(row.cells[plan.layout.sourceColumnIndex]);
  const record = plan.layout.stripOuterQuotes ? stripOuterQuotes(source) : source;
  const split = splitImportV2DelimitedRecord(record, plan.layout.delimiter);
  return split?.map((cell) => cell.trim()) ?? null;
}

function materializeRows(
  rows: readonly ImportV2RawRow[],
  plan: ImportV2TransformationPlan,
): { rows: ProfileRowInput[]; structuralFailures: number[] } {
  const materialized: ProfileRowInput[] = [];
  const structuralFailures: number[] = [];

  for (const row of rows) {
    const cells = logicalCells(row, plan);
    if (!cells) {
      if (row.rowNumber >= plan.layout.firstDataRowNumber) structuralFailures.push(row.rowNumber);
      continue;
    }
    materialized.push({
      rowNumber: row.rowNumber,
      cells,
      ...(plan.layout.kind === 'grid' && row.mergedColumnIndexes?.length
        ? { mergedColumnIndexes: [...row.mergedColumnIndexes] }
        : {}),
    });
  }
  return { rows: materialized, structuralFailures };
}

function amountColumnIndexes(plan: ImportV2TransformationPlan): number[] {
  if (plan.amount.strategy === 'debit-credit') {
    return [plan.amount.debitColumnIndex, plan.amount.creditColumnIndex];
  }
  if (plan.amount.strategy === 'amount-direction') {
    return [plan.amount.amountColumnIndex, plan.amount.directionColumnIndex];
  }
  return [plan.amount.columnIndex];
}

function resolvedMapping(
  document: ImportV2RawDocument,
  plan: ImportV2TransformationPlan,
): ResolvedImportV2Mapping {
  const sheetIndex = document.sheets.findIndex(({ id }) => id === plan.sheetId);
  const sheet = document.sheets[sheetIndex]!;
  return {
    sheetId: plan.sheetId,
    sheetName: sheet.name,
    sheetIndex,
    headerCandidateId: `interpretation-plan-v${plan.contractVersion}`,
    headerRowNumber: plan.layout.headerRowNumber,
    date: { ...plan.date },
    descriptionColumnIndexes: [...plan.description.columnIndexes],
    amount: plan.amount.strategy === 'debit-credit'
      ? { ...plan.amount }
      : plan.amount.strategy === 'amount-direction'
        ? { ...plan.amount }
        : { ...plan.amount },
    currencyColumnIndexes: [],
  };
}

export function createImportV2InterpretationPreview(
  document: ImportV2RawDocument,
  plan: ImportV2TransformationPlan,
  today?: string,
): ImportV2InterpretationPreviewResult {
  const planIssues = validateImportV2TransformationPlan(document, plan);
  if (planIssues.length > 0) {
    throw new Error(`invalid_interpretation_plan:${planIssues.map(({ code }) => code).join(',')}`);
  }

  const sheet = document.sheets.find(({ id }) => id === plan.sheetId)!;
  const { rows, structuralFailures } = materializeRows(sheet.rows, plan);
  const validation = extractImportV2Rows(rows, resolvedMapping(document, plan), {
    sourceKind: document.sourceKind === 'csv' ? 'structured-csv' : 'structured-xlsx',
    ...(document.sourceKind === 'csv' && plan.layout.kind === 'delimited-cell'
      && (plan.layout.delimiter === ',' || plan.layout.delimiter === ';')
      ? { csvDelimiter: plan.layout.delimiter }
      : {}),
    today,
  });

  const unresolved = new Set<number>(structuralFailures);
  const preview: ImportV2PreviewRow[] = [];
  for (const row of validation.rows) {
    const hasBlockingIssue = row.issues.some(({ severity }) => severity === 'error');
    if (
      hasBlockingIssue
      || !row.date
      || !row.description
      || row.signedAmountMinor == null
      || row.signedAmountMinor === 0
    ) {
      unresolved.add(row.sourceRowNumber);
      continue;
    }
    if (preview.length >= IMPORT_V2_INTERPRETATION_LIMITS.previewRows) continue;
    preview.push({
      date: row.date,
      description: row.description,
      signedAmountMinor: row.signedAmountMinor,
      type: row.signedAmountMinor < 0 ? 'expense' : 'income',
      provenance: {
        sourceRowNumber: row.sourceRowNumber,
        dateColumnIndex: plan.date.columnIndex,
        descriptionColumnIndexes: [...plan.description.columnIndexes],
        amountColumnIndexes: amountColumnIndexes(plan),
      },
    });
  }

  return {
    preview,
    unresolvedSourceRowNumbers: [...unresolved].sort((left, right) => left - right),
    validation,
  };
}
