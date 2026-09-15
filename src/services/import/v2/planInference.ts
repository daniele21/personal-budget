import {
  createImportV2InterpretationPreview,
  type ImportV2InterpretationFeedback,
  type ImportV2InterpretationProposal,
  type ImportV2RawDocument,
  type ImportV2RawSheet,
  type ImportV2TransformationPlan,
  validateImportV2TransformationPlan,
} from '../../../domain/import/v2';
import {
  HARNEX_SCHEMA_INFERENCE_USE_CASE,
  harnexClient,
  type HarnexClient,
  type HarnexFailure,
} from '../../../platform/harnex';

const PLAN_AMBIGUITIES = ['sheet', 'layout', 'date', 'description', 'amount'] as const;
type PlanAmbiguity = (typeof PLAN_AMBIGUITIES)[number];

export type ImportV2PlanInferenceAmbiguity =
  | PlanAmbiguity
  | 'invalid-response'
  | 'invalid-plan'
  | 'preview';

export type ImportV2PlanInferenceOutcome =
  | { status: 'resolved'; proposal: ImportV2InterpretationProposal }
  | { status: 'ambiguous'; ambiguities: readonly ImportV2PlanInferenceAmbiguity[] }
  | { status: 'unsupported' }
  | { status: 'assistance-unavailable'; failure: HarnexFailure };

export interface InferImportV2PlanOptions {
  client?: HarnexClient;
  signal?: AbortSignal;
  feedback?: ImportV2InterpretationFeedback;
  today?: string;
  proposalIdFactory?: () => string;
}

type UnknownRecord = Record<string, unknown>;
let proposalSequence = 0;

function failure(code: HarnexFailure['code'], message: string): HarnexFailure {
  return { code, message };
}

function cancelledFailure(): HarnexFailure {
  return failure('CANCELLED', 'Source interpretation was cancelled.');
}

function nextProposalId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  proposalSequence += 1;
  return `proposal-${Date.now().toString(36)}-${proposalSequence.toString(36)}`;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === expected.size
    && Object.keys(value).every((key) => expected.has(key));
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function parsePlan(value: unknown, document: ImportV2RawDocument): ImportV2TransformationPlan | null {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'contractVersion',
    'sheetId',
    'layout',
    'date',
    'description',
    'amount',
  ])) return null;
  if (value.contractVersion !== 1 || typeof value.sheetId !== 'string') return null;

  const layout = value.layout;
  if (!isRecord(layout) || typeof layout.kind !== 'string') return null;
  let parsedLayout: ImportV2TransformationPlan['layout'];
  if (layout.kind === 'grid') {
    if (!hasOnlyKeys(layout, ['kind', 'headerRowNumber', 'firstDataRowNumber'])
      || !integer(layout.headerRowNumber)
      || !integer(layout.firstDataRowNumber)) return null;
    parsedLayout = {
      kind: 'grid',
      headerRowNumber: layout.headerRowNumber,
      firstDataRowNumber: layout.firstDataRowNumber,
    };
  } else if (layout.kind === 'delimited-cell') {
    if (!hasOnlyKeys(layout, [
      'kind',
      'sourceColumnIndex',
      'delimiter',
      'stripOuterQuotes',
      'headerRowNumber',
      'firstDataRowNumber',
    ])
      || !integer(layout.sourceColumnIndex)
      || ![',', ';', '\t', '|'].includes(String(layout.delimiter))
      || typeof layout.stripOuterQuotes !== 'boolean'
      || !integer(layout.headerRowNumber)
      || !integer(layout.firstDataRowNumber)) return null;
    parsedLayout = {
      kind: 'delimited-cell',
      sourceColumnIndex: layout.sourceColumnIndex,
      delimiter: layout.delimiter as ',' | ';' | '\t' | '|',
      stripOuterQuotes: layout.stripOuterQuotes,
      headerRowNumber: layout.headerRowNumber,
      firstDataRowNumber: layout.firstDataRowNumber,
    };
  } else return null;

  const date = value.date;
  if (!isRecord(date)
    || !hasOnlyKeys(date, ['columnIndex', 'parser'])
    || !integer(date.columnIndex)
    || !['iso-date', 'dmy-slash', 'dmy-dash', 'excel-date'].includes(String(date.parser))) return null;

  const description = value.description;
  if (!isRecord(description)
    || !hasOnlyKeys(description, ['columnIndexes'])
    || !Array.isArray(description.columnIndexes)
    || description.columnIndexes.length === 0
    || !description.columnIndexes.every(integer)) return null;

  const amount = value.amount;
  if (!isRecord(amount) || typeof amount.strategy !== 'string') return null;
  let parsedAmount: ImportV2TransformationPlan['amount'];
  if (amount.strategy === 'signed-negative-expense' || amount.strategy === 'signed-positive-expense') {
    if (!hasOnlyKeys(amount, ['strategy', 'columnIndex']) || !integer(amount.columnIndex)) return null;
    parsedAmount = { strategy: amount.strategy, columnIndex: amount.columnIndex };
  } else if (amount.strategy === 'debit-credit') {
    if (!hasOnlyKeys(amount, ['strategy', 'debitColumnIndex', 'creditColumnIndex'])
      || !integer(amount.debitColumnIndex)
      || !integer(amount.creditColumnIndex)) return null;
    parsedAmount = {
      strategy: 'debit-credit',
      debitColumnIndex: amount.debitColumnIndex,
      creditColumnIndex: amount.creditColumnIndex,
    };
  } else if (amount.strategy === 'amount-direction') {
    if (!hasOnlyKeys(amount, ['strategy', 'amountColumnIndex', 'directionColumnIndex', 'directionMapId'])
      || !integer(amount.amountColumnIndex)
      || !integer(amount.directionColumnIndex)
      || amount.directionMapId !== 'debit-credit-v1') return null;
    parsedAmount = {
      strategy: 'amount-direction',
      amountColumnIndex: amount.amountColumnIndex,
      directionColumnIndex: amount.directionColumnIndex,
      directionMapId: 'debit-credit-v1',
    };
  } else return null;

  const plan: ImportV2TransformationPlan = {
    contractVersion: 1,
    sheetId: value.sheetId,
    layout: parsedLayout,
    date: {
      columnIndex: date.columnIndex,
      parser: date.parser as ImportV2TransformationPlan['date']['parser'],
    },
    description: {
      columnIndexes: description.columnIndexes,
    },
    amount: parsedAmount,
  };
  return validateImportV2TransformationPlan(document, plan).length === 0 ? plan : null;
}

function visibleDocument(document: ImportV2RawDocument): ImportV2RawDocument {
  return {
    ...document,
    sheets: document.sheets.filter(({ state }) => state === 'visible'),
  };
}

function boundedSheet(sheet: ImportV2RawSheet, rowsPerSheet: number) {
  return {
    id: sheet.id,
    name: sheet.name,
    totalNonEmptyRows: sheet.totalNonEmptyRows,
    samplesTruncated: sheet.samplesTruncated || sheet.rows.length > rowsPerSheet,
    rows: sheet.rows.slice(0, rowsPerSheet),
  };
}

function inputPayload(
  document: ImportV2RawDocument,
  rowsPerSheet: number,
  feedback?: ImportV2InterpretationFeedback,
): string {
  return JSON.stringify({
    task: 'interpret-transaction-source',
    contractVersion: 1,
    rules: [
      'Return only the declarative plan primitives allowed by the response schema.',
      'Rows use original one-based rowNumber values; plan column indexes are zero-based.',
      'Use grid when source cells already represent logical columns.',
      'Use delimited-cell only when one source cell contains a repeated logical record delimiter.',
      'For delimited-cell, date/description/amount column indexes refer to fields after splitting that cell.',
      'Select description source columns only; Aura owns the canonical joining semantics.',
      'Do not invent transaction values. Return ambiguous or unsupported when evidence is insufficient.',
      'When feedback is present, return a complete revised plan rather than a patch.',
    ],
    ...(feedback ? {
      userFeedback: {
        area: feedback.area,
        ...(feedback.previousProposal ? { previousProposal: feedback.previousProposal } : {}),
      },
    } : {}),
    document: {
      sourceKind: document.sourceKind,
      sheets: document.sheets.map((sheet) => boundedSheet(sheet, rowsPerSheet)),
    },
  });
}

function planJsonSchema(document: ImportV2RawDocument): string {
  const sheetIds = document.sheets.map(({ id }) => id);
  const index = { type: 'integer', minimum: 0, maximum: 63 };
  const row = { type: 'integer', minimum: 1 };
  const layout = {
    oneOf: [
      {
        type: 'object', additionalProperties: false,
        required: ['kind', 'headerRowNumber', 'firstDataRowNumber'],
        properties: { kind: { enum: ['grid'] }, headerRowNumber: row, firstDataRowNumber: row },
      },
      {
        type: 'object', additionalProperties: false,
        required: ['kind', 'sourceColumnIndex', 'delimiter', 'stripOuterQuotes', 'headerRowNumber', 'firstDataRowNumber'],
        properties: {
          kind: { enum: ['delimited-cell'] }, sourceColumnIndex: index,
          delimiter: { enum: [',', ';', '\t', '|'] }, stripOuterQuotes: { type: 'boolean' },
          headerRowNumber: row, firstDataRowNumber: row,
        },
      },
    ],
  };
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
          strategy: { enum: ['amount-direction'] }, amountColumnIndex: index, directionColumnIndex: index,
          directionMapId: { enum: ['debit-credit-v1'] },
        },
      },
    ],
  };
  const plan = {
    type: 'object', additionalProperties: false,
    required: ['contractVersion', 'sheetId', 'layout', 'date', 'description', 'amount'],
    properties: {
      contractVersion: { enum: [1] }, sheetId: { type: 'string', enum: sheetIds }, layout,
      date: {
        type: 'object', additionalProperties: false, required: ['columnIndex', 'parser'],
        properties: { columnIndex: index, parser: { enum: ['iso-date', 'dmy-slash', 'dmy-dash', 'excel-date'] } },
      },
      description: {
        type: 'object', additionalProperties: false, required: ['columnIndexes'],
        properties: {
          columnIndexes: { type: 'array', minItems: 1, maxItems: 8, uniqueItems: true, items: index },
        },
      },
      amount,
    },
  };
  return JSON.stringify({
    type: 'object',
    oneOf: [
      {
        type: 'object', additionalProperties: false, required: ['status', 'plan'],
        properties: { status: { enum: ['resolved'] }, plan },
      },
      {
        type: 'object', additionalProperties: false, required: ['status', 'ambiguities'],
        properties: {
          status: { enum: ['ambiguous'] },
          ambiguities: { type: 'array', minItems: 1, uniqueItems: true, items: { enum: PLAN_AMBIGUITIES } },
        },
      },
      {
        type: 'object', additionalProperties: false, required: ['status'],
        properties: { status: { enum: ['unsupported'] } },
      },
    ],
  });
}

function parseOutcome(
  answer: string,
  document: ImportV2RawDocument,
  options: InferImportV2PlanOptions,
): ImportV2PlanInferenceOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    return { status: 'ambiguous', ambiguities: ['invalid-response'] };
  }
  if (!isRecord(parsed) || typeof parsed.status !== 'string') {
    return { status: 'ambiguous', ambiguities: ['invalid-response'] };
  }
  if (parsed.status === 'unsupported') {
    return hasOnlyKeys(parsed, ['status'])
      ? { status: 'unsupported' }
      : { status: 'ambiguous', ambiguities: ['invalid-response'] };
  }
  if (parsed.status === 'ambiguous') {
    if (!hasOnlyKeys(parsed, ['status', 'ambiguities'])
      || !Array.isArray(parsed.ambiguities)
      || parsed.ambiguities.length === 0
      || !parsed.ambiguities.every((item): item is PlanAmbiguity =>
        typeof item === 'string' && PLAN_AMBIGUITIES.includes(item as PlanAmbiguity))
      || new Set(parsed.ambiguities).size !== parsed.ambiguities.length) {
      return { status: 'ambiguous', ambiguities: ['invalid-response'] };
    }
    return { status: 'ambiguous', ambiguities: parsed.ambiguities };
  }
  if (parsed.status !== 'resolved' || !hasOnlyKeys(parsed, ['status', 'plan'])) {
    return { status: 'ambiguous', ambiguities: ['invalid-response'] };
  }

  const plan = parsePlan(parsed.plan, document);
  if (!plan) return { status: 'ambiguous', ambiguities: ['invalid-plan'] };
  let preview;
  try {
    preview = createImportV2InterpretationPreview(document, plan, options.today);
  } catch {
    return { status: 'ambiguous', ambiguities: ['preview'] };
  }
  if (preview.preview.length === 0) return { status: 'ambiguous', ambiguities: ['preview'] };

  const proposalId = (options.proposalIdFactory ?? nextProposalId)();
  return {
    status: 'resolved',
    proposal: {
      proposalId,
      plan,
      preview: preview.preview,
      unresolvedSourceRowNumbers: preview.unresolvedSourceRowNumbers,
    },
  };
}

async function runConnectedInference(
  document: ImportV2RawDocument,
  client: HarnexClient,
  options: InferImportV2PlanOptions,
): Promise<ImportV2PlanInferenceOutcome> {
  if (options.signal?.aborted) return { status: 'assistance-unavailable', failure: cancelledFailure() };
  const capability = await client.probe(HARNEX_SCHEMA_INFERENCE_USE_CASE);
  if (capability.status === 'unavailable') return { status: 'assistance-unavailable', failure: capability.failure };
  if (options.signal?.aborted) return { status: 'assistance-unavailable', failure: cancelledFailure() };

  const jsonSchema = planJsonSchema(document);
  if (jsonSchema.length > capability.maxJsonSchemaCharacters) {
    return {
      status: 'assistance-unavailable',
      failure: failure('INVALID_REQUEST', 'Interpretation response schema exceeds Harnex capability limits.'),
    };
  }

  let rowsPerSheet = Math.min(12, Math.max(2, ...document.sheets.map(({ rows }) => rows.length));
  let input = inputPayload(document, rowsPerSheet, options.feedback);
  while (input.length > capability.maxInputCharacters && rowsPerSheet > 2) {
    rowsPerSheet = Math.max(2, Math.floor(rowsPerSheet / 2));
    input = inputPayload(document, rowsPerSheet, options.feedback);
  }
  if (input.length > capability.maxInputCharacters) {
    return {
      status: 'assistance-unavailable',
      failure: failure('INVALID_REQUEST', 'Bounded source interpretation exceeds Harnex capability limits.'),
    };
  }

  const generated = await client.generate({
    useCaseId: HARNEX_SCHEMA_INFERENCE_USE_CASE,
    input,
    jsonSchema,
  });
  if (generated.status === 'failed') return { status: 'assistance-unavailable', failure: generated.failure };
  if (options.signal?.aborted) return { status: 'assistance-unavailable', failure: cancelledFailure() };
  return parseOutcome(generated.answer, document, options);
}

export async function inferImportV2PlanWithHarnex(
  rawDocument: ImportV2RawDocument,
  options: InferImportV2PlanOptions = {},
): Promise<ImportV2PlanInferenceOutcome> {
  const document = visibleDocument(rawDocument);
  if (document.sheets.length === 0 || document.sheets.every(({ rows }) => rows.length < 2)) {
    return { status: 'unsupported' };
  }
  if (options.signal?.aborted) return { status: 'assistance-unavailable', failure: cancelledFailure() };

  const client = options.client ?? harnexClient;
  let connected = false;
  let outcome: ImportV2PlanInferenceOutcome = {
    status: 'assistance-unavailable',
    failure: failure('RUNTIME_FAILURE', 'Source interpretation failed.'),
  };
  const onAbort = () => { void client.cancel(); };
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const connection = await client.connect();
    if (connection.status === 'unavailable') {
      outcome = { status: 'assistance-unavailable', failure: connection.failure };
    } else {
      connected = true;
      outcome = await runConnectedInference(document, client, options);
    }
  } catch {
    outcome = {
      status: 'assistance-unavailable',
      failure: failure('RUNTIME_FAILURE', 'Source interpretation failed.'),
    };
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    if (connected) {
      try {
        const disconnected = await client.disconnect();
        if (disconnected.status === 'failed') {
          outcome = { status: 'assistance-unavailable', failure: disconnected.failure };
        }
      } catch {
        outcome = {
          status: 'assistance-unavailable',
          failure: failure('RUNTIME_FAILURE', 'Source interpretation cleanup failed.'),
        };
      }
    }
  }
  return outcome;
}
