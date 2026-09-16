import type { StructuredImportValidationResult } from '../../../domain/import';
import {
  IMPORT_V2_INTERPRETATION_LIMITS,
  createImportV2InterpretationPreview,
  type ConfirmedImportV2Interpretation,
  type ImportV2RawCell,
  type ImportV2RawDocument,
  type ImportV2RawRow,
  type ImportV2TransformationPlan,
} from '../../../domain/import/v2';
import { readImportV2ExecutionDocument } from '../../../data/import/rawImportV2DocumentReader';
import {
  HARNEX_SCHEMA_INFERENCE_USE_CASE,
  harnexClient,
  type HarnexClient,
  type HarnexFailure,
} from '../../../platform/harnex';
import type { ConfirmedImportV2ExecutionOutcome } from './confirmedPlanExecution';

export const IMPORT_V2_ROW_REPAIR_MAX_ROWS = 8 as const;
const MIN_REPAIR_CELL_CODE_POINTS = 32;

type UnresolvedConfirmedExecution = Extract<ConfirmedImportV2ExecutionOutcome, { status: 'unresolved' }>;
type ValidatedRow = StructuredImportValidationResult['rows'][number];
type RepairSemanticPlan = Pick<ImportV2TransformationPlan, 'date' | 'description' | 'amount'>;

type ParsedRepairAnswer =
  | { status: 'repair'; repair: RepairSemanticPlan }
  | { status: 'unresolved' }
  | { status: 'global-plan-wrong' };

export type ImportV2RowRepairOutcome =
  | {
      status: 'resolved';
      validation: StructuredImportValidationResult;
      repairedSourceRowNumbers: readonly number[];
    }
  | {
      status: 'unresolved';
      validation: StructuredImportValidationResult;
      sourceRowNumbers: readonly number[];
      repairedSourceRowNumbers: readonly number[];
    }
  | {
      status: 'global-plan-wrong';
      validation: StructuredImportValidationResult;
      sourceRowNumbers: readonly number[];
      repairedSourceRowNumbers: readonly number[];
    }
  | {
      status: 'assistance-unavailable';
      validation: StructuredImportValidationResult;
      sourceRowNumbers: readonly number[];
      repairedSourceRowNumbers: readonly number[];
      failure: HarnexFailure;
    };

export interface RepairImportV2RowsOptions {
  client?: HarnexClient;
  signal?: AbortSignal;
  today?: string;
}

function failure(code: HarnexFailure['code'], message: string): HarnexFailure {
  return { code, message };
}

function cancelledFailure(): HarnexFailure {
  return failure('CANCELLED', 'Row repair was cancelled.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === expected.size
    && Object.keys(value).every((key) => expected.has(key));
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function parseSemanticPlan(value: unknown): RepairSemanticPlan | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['date', 'description', 'amount'])) return null;

  const date = value.date;
  if (!isRecord(date)
    || !hasOnlyKeys(date, ['columnIndex', 'parser'])
    || !integer(date.columnIndex)
    || date.columnIndex < 0
    || date.columnIndex >= IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns
    || !['iso-date', 'dmy-slash', 'dmy-dash', 'excel-date'].includes(String(date.parser))) return null;

  const description = value.description;
  if (!isRecord(description)
    || !hasOnlyKeys(description, ['columnIndexes'])
    || !Array.isArray(description.columnIndexes)
    || description.columnIndexes.length === 0
    || description.columnIndexes.length > 8
    || !description.columnIndexes.every((index) =>
      integer(index) && index >= 0 && index < IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns)
    || new Set(description.columnIndexes).size !== description.columnIndexes.length) return null;

  const amount = value.amount;
  if (!isRecord(amount) || typeof amount.strategy !== 'string') return null;
  let parsedAmount: ImportV2TransformationPlan['amount'];
  if (amount.strategy === 'signed-negative-expense' || amount.strategy === 'signed-positive-expense') {
    if (!hasOnlyKeys(amount, ['strategy', 'columnIndex'])
      || !integer(amount.columnIndex)
      || amount.columnIndex < 0
      || amount.columnIndex >= IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns) return null;
    parsedAmount = { strategy: amount.strategy, columnIndex: amount.columnIndex };
  } else if (amount.strategy === 'debit-credit') {
    if (!hasOnlyKeys(amount, ['strategy', 'debitColumnIndex', 'creditColumnIndex'])
      || !integer(amount.debitColumnIndex)
      || !integer(amount.creditColumnIndex)
      || amount.debitColumnIndex < 0
      || amount.creditColumnIndex < 0
      || amount.debitColumnIndex >= IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns
      || amount.creditColumnIndex >= IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns
      || amount.debitColumnIndex === amount.creditColumnIndex) return null;
    parsedAmount = {
      strategy: 'debit-credit',
      debitColumnIndex: amount.debitColumnIndex,
      creditColumnIndex: amount.creditColumnIndex,
    };
  } else if (amount.strategy === 'amount-direction') {
    if (!hasOnlyKeys(amount, ['strategy', 'amountColumnIndex', 'directionColumnIndex', 'directionMapId'])
      || !integer(amount.amountColumnIndex)
      || !integer(amount.directionColumnIndex)
      || amount.amountColumnIndex < 0
      || amount.directionColumnIndex < 0
      || amount.amountColumnIndex >= IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns
      || amount.directionColumnIndex >= IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns
      || amount.amountColumnIndex === amount.directionColumnIndex
      || amount.directionMapId !== 'debit-credit-v1') return null;
    parsedAmount = {
      strategy: 'amount-direction',
      amountColumnIndex: amount.amountColumnIndex,
      directionColumnIndex: amount.directionColumnIndex,
      directionMapId: 'debit-credit-v1',
    };
  } else return null;

  return {
    date: {
      columnIndex: date.columnIndex,
      parser: date.parser as ImportV2TransformationPlan['date']['parser'],
    },
    description: { columnIndexes: description.columnIndexes as number[] },
    amount: parsedAmount,
  };
}

function parseRepairAnswer(answer: string, sourceRowNumber: number): ParsedRepairAnswer | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.status !== 'string') return null;
  if (parsed.status === 'unresolved' || parsed.status === 'global-plan-wrong') {
    return hasOnlyKeys(parsed, ['status']) ? { status: parsed.status } : null;
  }
  if (parsed.status !== 'repair' || !hasOnlyKeys(parsed, ['status', 'sourceRowNumber', 'repair'])) return null;
  if (parsed.sourceRowNumber !== sourceRowNumber) return null;
  const repair = parseSemanticPlan(parsed.repair);
  return repair ? { status: 'repair', repair } : null;
}

function indexSchema() {
  return { type: 'integer', minimum: 0, maximum: IMPORT_V2_INTERPRETATION_LIMITS.logicalColumns - 1 };
}

function repairJsonSchema(sourceRowNumber: number): string {
  const index = indexSchema();
  const amount = {
    oneOf: [
      {
        type: 'object', additionalProperties: false, required: ['strategy', 'columnIndex'],
        properties: { strategy: { enum: ['signed-negative-expense', 'signed-positive-expense'] }, columnIndex: index },
      },
      {
        type: 'object', additionalProperties: false, required: ['strategy', 'debitColumnIndex', 'creditColumnIndex'],
        properties: { strategy: { enum: ['debit-credit'] }, debitColumnIndex: index, creditColumnIndex: index },
      },
      {
        type: 'object', additionalProperties: false,
        required: ['strategy', 'amountColumnIndex', 'directionColumnIndex', 'directionMapId'],
        properties: {
          strategy: { enum: ['amount-direction'] },
          amountColumnIndex: index,
          directionColumnIndex: index,
          directionMapId: { enum: ['debit-credit-v1'] },
        },
      },
    ],
  };
  const semanticRepair = {
    type: 'object',
    additionalProperties: false,
    required: ['date', 'description', 'amount'],
    properties: {
      date: {
        type: 'object', additionalProperties: false, required: ['columnIndex', 'parser'],
        properties: { columnIndex: index, parser: { enum: ['iso-date', 'dmy-slash', 'dmy-dash', 'excel-date'] } },
      },
      description: {
        type: 'object', additionalProperties: false, required: ['columnIndexes'],
        properties: { columnIndexes: { type: 'array', minItems: 1, maxItems: 8, uniqueItems: true, items: index } },
      },
      amount,
    },
  };
  return JSON.stringify({
    type: 'object',
    oneOf: [
      {
        type: 'object', additionalProperties: false, required: ['status', 'sourceRowNumber', 'repair'],
        properties: {
          status: { enum: ['repair'] },
          sourceRowNumber: { enum: [sourceRowNumber] },
          repair: semanticRepair,
        },
      },
      {
        type: 'object', additionalProperties: false, required: ['status'],
        properties: { status: { enum: ['unresolved'] } },
      },
      {
        type: 'object', additionalProperties: false, required: ['status'],
        properties: { status: { enum: ['global-plan-wrong'] } },
      },
    ],
  });
}

function clampText(value: string, limit: number): string {
  return Array.from(value).slice(0, limit).join('');
}

function boundedCell(value: ImportV2RawCell, limit: number): ImportV2RawCell {
  return typeof value === 'string' ? clampText(value, limit) : value;
}

function boundedRow(row: ImportV2RawRow, limit: number) {
  return {
    rowNumber: row.rowNumber,
    cells: row.cells.map((cell) => boundedCell(cell, limit)),
    ...(row.mergedColumnIndexes?.length ? { mergedColumnIndexes: [...row.mergedColumnIndexes] } : {}),
  };
}

function repairInput(
  confirmed: ConfirmedImportV2Interpretation,
  headerRow: ImportV2RawRow,
  sourceRow: ImportV2RawRow,
  issueCodes: readonly string[],
  cellCodePoints: number,
): string {
  return JSON.stringify({
    task: 'repair-unresolved-transaction-row',
    contractVersion: 1,
    rules: [
      'The confirmed sheet and record layout are immutable for this repair.',
      'Return only source column references, an Aura-owned date parser, and an Aura-owned amount strategy.',
      'Never return transaction date, description, amount, type, category, or other financial values.',
      'Return global-plan-wrong if the confirmed global interpretation itself must change.',
      'Return unresolved when the row cannot be repaired safely from the supplied source context.',
    ],
    confirmedPlan: confirmed.plan,
    issueCodes,
    context: {
      headerRow: boundedRow(headerRow, cellCodePoints),
      sourceRow: boundedRow(sourceRow, cellCodePoints),
    },
  });
}

function rowDocument(
  document: ImportV2RawDocument,
  confirmed: ConfirmedImportV2Interpretation,
  sourceRowNumber: number,
): ImportV2RawDocument | null {
  const sheet = document.sheets.find(({ id }) => id === confirmed.plan.sheetId);
  if (!sheet) return null;
  const headerRow = sheet.rows.find(({ rowNumber }) => rowNumber === confirmed.plan.layout.headerRowNumber);
  const sourceRow = sheet.rows.find(({ rowNumber }) => rowNumber === sourceRowNumber);
  if (!headerRow || !sourceRow || sourceRow.rowNumber <= headerRow.rowNumber) return null;
  return {
    contractVersion: document.contractVersion,
    sourceKind: document.sourceKind,
    sheets: [{
      ...sheet,
      rows: [headerRow, sourceRow],
      totalNonEmptyRows: 2,
      samplesTruncated: false,
    }],
  };
}

function deterministicRepairRow(
  document: ImportV2RawDocument,
  confirmed: ConfirmedImportV2Interpretation,
  sourceRowNumber: number,
  semanticRepair: RepairSemanticPlan,
  today?: string,
): ValidatedRow | null {
  const boundedDocument = rowDocument(document, confirmed, sourceRowNumber);
  if (!boundedDocument) return null;
  const layout = {
    ...confirmed.plan.layout,
    firstDataRowNumber: sourceRowNumber,
  } as ImportV2TransformationPlan['layout'];
  const plan: ImportV2TransformationPlan = {
    contractVersion: confirmed.plan.contractVersion,
    sheetId: confirmed.plan.sheetId,
    layout,
    date: semanticRepair.date,
    description: semanticRepair.description,
    amount: semanticRepair.amount,
  };
  try {
    const executed = createImportV2InterpretationPreview(boundedDocument, plan, today);
    if (executed.unresolvedSourceRowNumbers.length > 0 || executed.validation.hasBlockingIssues) return null;
    const row = executed.validation.rows.find(({ sourceRowNumber: rowNumber }) => rowNumber === sourceRowNumber);
    if (!row
      || row.issues.some(({ severity }) => severity === 'error')
      || !row.date
      || !row.description
      || row.signedAmountMinor == null
      || row.signedAmountMinor === 0) return null;
    return row;
  } catch {
    return null;
  }
}

function mergedValidation(
  original: StructuredImportValidationResult,
  repairedRows: ReadonlyMap<number, ValidatedRow>,
): StructuredImportValidationResult {
  const repairedNumbers = new Set(repairedRows.keys());
  const rows = original.rows.map((row) => repairedRows.get(row.sourceRowNumber) ?? row);
  const issues = [
    ...original.issues.filter((issue) => issue.rowNumber == null || !repairedNumbers.has(issue.rowNumber)),
    ...[...repairedRows.values()].flatMap((row) => row.issues),
  ];
  return {
    sourceKind: original.sourceKind,
    rows,
    issues,
    hasBlockingIssues: issues.some(({ severity }) => severity === 'error'),
  };
}

function remainingSourceRows(
  original: readonly number[],
  validation: StructuredImportValidationResult,
  repairedRows: ReadonlyMap<number, ValidatedRow>,
): number[] {
  const remaining = new Set(original.filter((rowNumber) => !repairedRows.has(rowNumber)));
  for (const row of validation.rows) {
    if (row.issues.some(({ severity }) => severity === 'error')) remaining.add(row.sourceRowNumber);
  }
  return [...remaining].sort((left, right) => left - right);
}

function issueCodesForRow(execution: UnresolvedConfirmedExecution, sourceRowNumber: number): string[] {
  return execution.validation.rows
    .find(({ sourceRowNumber: rowNumber }) => rowNumber === sourceRowNumber)
    ?.issues.map(({ code }) => code) ?? [];
}

export async function repairUnresolvedImportV2RowsWithHarnex(
  file: File,
  confirmed: ConfirmedImportV2Interpretation,
  execution: UnresolvedConfirmedExecution,
  options: RepairImportV2RowsOptions = {},
): Promise<ImportV2RowRepairOutcome> {
  const originalRows = [...new Set(execution.sourceRowNumbers)].sort((left, right) => left - right);
  const emptyRepairs = new Map<number, ValidatedRow>();
  if (originalRows.length === 0 || originalRows.length > IMPORT_V2_ROW_REPAIR_MAX_ROWS) {
    return {
      status: 'unresolved',
      validation: execution.validation,
      sourceRowNumbers: originalRows,
      repairedSourceRowNumbers: [],
    };
  }
  const hasNonRowBlockingIssue = execution.validation.issues.some((issue) =>
    issue.severity === 'error' && issue.rowNumber == null);
  if (hasNonRowBlockingIssue) {
    return {
      status: 'global-plan-wrong',
      validation: execution.validation,
      sourceRowNumbers: originalRows,
      repairedSourceRowNumbers: [],
    };
  }
  if (options.signal?.aborted) {
    return {
      status: 'assistance-unavailable',
      validation: execution.validation,
      sourceRowNumbers: originalRows,
      repairedSourceRowNumbers: [],
      failure: cancelledFailure(),
    };
  }

  const read = await readImportV2ExecutionDocument(file);
  if (read.kind === 'rejected') {
    return {
      status: 'assistance-unavailable',
      validation: execution.validation,
      sourceRowNumbers: originalRows,
      repairedSourceRowNumbers: [],
      failure: failure('INVALID_REQUEST', 'Aura could not re-read the bounded source for row repair.'),
    };
  }
  const sheet = read.document.sheets.find(({ id }) => id === confirmed.plan.sheetId);
  const headerRow = sheet?.rows.find(({ rowNumber }) => rowNumber === confirmed.plan.layout.headerRowNumber);
  if (!sheet || !headerRow) {
    return {
      status: 'global-plan-wrong',
      validation: execution.validation,
      sourceRowNumbers: originalRows,
      repairedSourceRowNumbers: [],
    };
  }
  const sourceRows = new Map(sheet.rows.map((row) => [row.rowNumber, row]));
  const repairableRows = originalRows.filter((rowNumber) => sourceRows.has(rowNumber));
  if (repairableRows.length === 0) {
    return {
      status: 'unresolved',
      validation: execution.validation,
      sourceRowNumbers: originalRows,
      repairedSourceRowNumbers: [],
    };
  }

  const client = options.client ?? harnexClient;
  const repairedRows = new Map<number, ValidatedRow>();
  let connected = false;
  let terminalFailure: HarnexFailure | undefined;
  let globalPlanWrong = false;
  const onAbort = () => { void client.cancel(); };
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const connection = await client.connect();
    if (connection.status === 'unavailable') {
      terminalFailure = connection.failure;
    } else {
      connected = true;
      const capability = await client.probe(HARNEX_SCHEMA_INFERENCE_USE_CASE);
      if (capability.status === 'unavailable') {
        terminalFailure = capability.failure;
      } else {
        for (const sourceRowNumber of repairableRows) {
          if (options.signal?.aborted) {
            terminalFailure = cancelledFailure();
            break;
          }
          const sourceRow = sourceRows.get(sourceRowNumber)!;
          const jsonSchema = repairJsonSchema(sourceRowNumber);
          if (jsonSchema.length > capability.maxJsonSchemaCharacters) {
            terminalFailure = failure('INVALID_REQUEST', 'Row-repair response schema exceeds Harnex capability limits.');
            break;
          }

          let cellCodePoints = IMPORT_V2_INTERPRETATION_LIMITS.cellCodePoints;
          let input = repairInput(
            confirmed,
            headerRow,
            sourceRow,
            issueCodesForRow(execution, sourceRowNumber),
            cellCodePoints,
          );
          while (input.length > capability.maxInputCharacters && cellCodePoints > MIN_REPAIR_CELL_CODE_POINTS) {
            cellCodePoints = Math.max(MIN_REPAIR_CELL_CODE_POINTS, Math.floor(cellCodePoints / 2));
            input = repairInput(
              confirmed,
              headerRow,
              sourceRow,
              issueCodesForRow(execution, sourceRowNumber),
              cellCodePoints,
            );
          }
          if (input.length > capability.maxInputCharacters) {
            terminalFailure = failure('INVALID_REQUEST', 'Bounded row-repair context exceeds Harnex capability limits.');
            break;
          }

          const generated = await client.generate({
            useCaseId: HARNEX_SCHEMA_INFERENCE_USE_CASE,
            input,
            jsonSchema,
          });
          if (generated.status === 'failed') {
            terminalFailure = generated.failure;
            break;
          }
          if (options.signal?.aborted) {
            terminalFailure = cancelledFailure();
            break;
          }
          const parsed = parseRepairAnswer(generated.answer, sourceRowNumber);
          if (!parsed || parsed.status === 'unresolved') continue;
          if (parsed.status === 'global-plan-wrong') {
            globalPlanWrong = true;
            break;
          }
          const repaired = deterministicRepairRow(
            read.document,
            confirmed,
            sourceRowNumber,
            parsed.repair,
            options.today,
          );
          if (repaired) repairedRows.set(sourceRowNumber, repaired);
        }
      }
    }
  } catch {
    terminalFailure = failure('RUNTIME_FAILURE', 'Row repair failed.');
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    if (connected) {
      try {
        const disconnected = await client.disconnect();
        if (disconnected.status === 'failed') terminalFailure = disconnected.failure;
      } catch {
        terminalFailure = failure('RUNTIME_FAILURE', 'Row-repair cleanup failed.');
      }
    }
  }

  const validation = mergedValidation(execution.validation, repairedRows);
  const remaining = remainingSourceRows(originalRows, validation, repairedRows);
  const repairedSourceRowNumbers = [...repairedRows.keys()].sort((left, right) => left - right);
  if (globalPlanWrong) {
    return {
      status: 'global-plan-wrong',
      validation,
      sourceRowNumbers: remaining.length > 0 ? remaining : originalRows,
      repairedSourceRowNumbers,
    };
  }
  if (terminalFailure) {
    return {
      status: 'assistance-unavailable',
      validation,
      sourceRowNumbers: remaining,
      repairedSourceRowNumbers,
      failure: terminalFailure,
    };
  }
  if (remaining.length === 0 && !validation.hasBlockingIssues) {
    return { status: 'resolved', validation, repairedSourceRowNumbers };
  }
  return {
    status: 'unresolved',
    validation,
    sourceRowNumbers: remaining,
    repairedSourceRowNumbers,
  };
}
