import {
  ImportV2MappingError,
  resolveImportV2Mapping,
  type ImportV2MappingSelection,
  type SpreadsheetProfile,
} from '../../../domain/import/v2';
import {
  HARNEX_SCHEMA_INFERENCE_USE_CASE,
  harnexClient,
  type HarnexClient,
  type HarnexFailure,
} from '../../../platform/harnex';

const MODEL_AMBIGUITIES = ['sheet', 'header', 'date', 'description', 'amount'] as const;

type ModelAmbiguity = (typeof MODEL_AMBIGUITIES)[number];
export type ImportV2SchemaAmbiguity = ModelAmbiguity | 'invalid-response' | 'invalid-selection';

export interface ImportV2SchemaSuggestion {
  sheetId: string;
  headerCandidateId: string;
  selection: ImportV2MappingSelection;
}

export type ImportV2SchemaInferenceOutcome =
  | { status: 'resolved'; suggestion: ImportV2SchemaSuggestion }
  | { status: 'ambiguous'; ambiguities: readonly ImportV2SchemaAmbiguity[] }
  | { status: 'unsupported' }
  | { status: 'assistance-unavailable'; failure: HarnexFailure };

export interface InferImportV2SchemaOptions {
  client?: HarnexClient;
  signal?: AbortSignal;
}

type UnknownRecord = Record<string, unknown>;

function failure(code: HarnexFailure['code'], message: string): HarnexFailure {
  return { code, message };
}

const cancelledFailure = () => failure('CANCELLED', 'Schema assistance was cancelled.');
const invalidResponse = (): ImportV2SchemaInferenceOutcome => ({
  status: 'ambiguous',
  ambiguities: ['invalid-response'],
});

function visibleProfile(profile: SpreadsheetProfile): SpreadsheetProfile {
  return {
    ...profile,
    sheets: profile.sheets.filter((sheet) => sheet.state === 'visible'),
  };
}

function hasViableHeader(profile: SpreadsheetProfile): boolean {
  return profile.sheets.some((sheet) => sheet.headerCandidates.some((header) =>
    header.dateCandidates.length > 0
      && header.amountCandidates.length > 0
      && header.descriptionCandidateColumnIds.length > 0,
  ));
}

function inferencePayload(profile: SpreadsheetProfile): string {
  return JSON.stringify({
    task: 'select-transaction-schema',
    rules: [
      'Select only IDs present in this payload.',
      'Return ambiguous when evidence does not safely identify one mapping.',
      'Return unsupported when no advertised candidate combination can represent the transactions.',
    ],
    sourceKind: profile.sourceKind,
    csvDelimiter: profile.csvDelimiter,
    sheets: profile.sheets.map((sheet) => ({
      id: sheet.id,
      name: sheet.name,
      totalNonEmptyRows: sheet.totalNonEmptyRows,
      samplesTruncated: sheet.samplesTruncated,
      headerCandidates: sheet.headerCandidates.map((header) => ({
        id: header.id,
        rowNumber: header.rowNumber,
        score: header.score,
        columns: header.columns.map((column) => ({
          id: column.id,
          header: column.header,
          nonEmptyRatio: column.nonEmptyRatio,
          textRatio: column.textRatio,
          numericRatio: column.numericRatio,
          dateLikeRatio: column.dateLikeRatio,
          positiveNumericRatio: column.positiveNumericRatio,
          negativeNumericRatio: column.negativeNumericRatio,
          formulaCount: column.formulaCount,
          mergedCellCount: column.mergedCellCount,
          directionRatio: column.directionRatio,
          dateParsers: column.dateParsers,
          samples: column.samples,
        })),
        dateCandidates: header.dateCandidates,
        amountCandidates: header.amountCandidates,
        descriptionCandidateColumnIds: header.descriptionCandidateColumnIds,
      })),
    })),
  });
}

function inferenceJsonSchema(profile: SpreadsheetProfile): string {
  const sheetIds = profile.sheets.map((sheet) => sheet.id);
  const headers = profile.sheets.flatMap((sheet) => sheet.headerCandidates);
  const headerIds = headers.map((header) => header.id);
  const dateIds = headers.flatMap((header) => header.dateCandidates.map((candidate) => candidate.id));
  const amountIds = headers.flatMap((header) => header.amountCandidates.map((candidate) => candidate.id));
  const descriptionIds = headers.flatMap((header) => header.descriptionCandidateColumnIds);

  return JSON.stringify({
    type: 'object',
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: [
          'status',
          'sheetId',
          'headerCandidateId',
          'dateCandidateId',
          'descriptionColumnIds',
          'amountCandidateId',
        ],
        properties: {
          status: { enum: ['resolved'] },
          sheetId: { type: 'string', enum: sheetIds },
          headerCandidateId: { type: 'string', enum: headerIds },
          dateCandidateId: { type: 'string', enum: dateIds },
          descriptionColumnIds: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'string', enum: descriptionIds },
          },
          amountCandidateId: { type: 'string', enum: amountIds },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'ambiguities'],
        properties: {
          status: { enum: ['ambiguous'] },
          ambiguities: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'string', enum: MODEL_AMBIGUITIES },
          },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['status'],
        properties: { status: { enum: ['unsupported'] } },
      },
    ],
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === expected.size
    && Object.keys(value).every((key) => expected.has(key));
}

function parseModelOutcome(answer: string, profile: SpreadsheetProfile): ImportV2SchemaInferenceOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    return invalidResponse();
  }
  if (!isRecord(parsed) || typeof parsed.status !== 'string') return invalidResponse();

  if (parsed.status === 'unsupported') {
    return hasOnlyKeys(parsed, ['status']) ? { status: 'unsupported' } : invalidResponse();
  }

  if (parsed.status === 'ambiguous') {
    if (!hasOnlyKeys(parsed, ['status', 'ambiguities']) || !Array.isArray(parsed.ambiguities)) {
      return invalidResponse();
    }
    const ambiguities = parsed.ambiguities;
    if (
      ambiguities.length === 0
      || !ambiguities.every((value): value is ModelAmbiguity =>
        typeof value === 'string' && MODEL_AMBIGUITIES.includes(value as ModelAmbiguity))
      || new Set(ambiguities).size !== ambiguities.length
    ) {
      return invalidResponse();
    }
    return { status: 'ambiguous', ambiguities };
  }

  if (parsed.status !== 'resolved' || !hasOnlyKeys(parsed, [
    'status',
    'sheetId',
    'headerCandidateId',
    'dateCandidateId',
    'descriptionColumnIds',
    'amountCandidateId',
  ])) {
    return invalidResponse();
  }

  if (
    typeof parsed.sheetId !== 'string'
    || typeof parsed.headerCandidateId !== 'string'
    || typeof parsed.dateCandidateId !== 'string'
    || typeof parsed.amountCandidateId !== 'string'
    || !Array.isArray(parsed.descriptionColumnIds)
    || parsed.descriptionColumnIds.length === 0
    || !parsed.descriptionColumnIds.every((value): value is string => typeof value === 'string')
    || new Set(parsed.descriptionColumnIds).size !== parsed.descriptionColumnIds.length
  ) {
    return { status: 'ambiguous', ambiguities: ['invalid-selection'] };
  }

  const selection: ImportV2MappingSelection = {
    dateCandidateId: parsed.dateCandidateId,
    amountCandidateId: parsed.amountCandidateId,
    descriptionColumnIds: parsed.descriptionColumnIds,
    typeColumnId: null,
  };

  try {
    const resolved = resolveImportV2Mapping(profile, selection);
    if (resolved.sheetId !== parsed.sheetId || resolved.headerCandidateId !== parsed.headerCandidateId) {
      return { status: 'ambiguous', ambiguities: ['invalid-selection'] };
    }
    return {
      status: 'resolved',
      suggestion: {
        sheetId: parsed.sheetId,
        headerCandidateId: parsed.headerCandidateId,
        selection,
      },
    };
  } catch (error) {
    if (error instanceof ImportV2MappingError) {
      return { status: 'ambiguous', ambiguities: ['invalid-selection'] };
    }
    throw error;
  }
}

async function runConnectedInference(
  profile: SpreadsheetProfile,
  client: HarnexClient,
  signal?: AbortSignal,
): Promise<ImportV2SchemaInferenceOutcome> {
  if (signal?.aborted) return { status: 'assistance-unavailable', failure: cancelledFailure() };

  const capability = await client.probe(HARNEX_SCHEMA_INFERENCE_USE_CASE);
  if (capability.status === 'unavailable') {
    return { status: 'assistance-unavailable', failure: capability.failure };
  }
  if (signal?.aborted) return { status: 'assistance-unavailable', failure: cancelledFailure() };

  const input = inferencePayload(profile);
  const jsonSchema = inferenceJsonSchema(profile);
  if (
    input.length > capability.maxInputCharacters
    || jsonSchema.length > capability.maxJsonSchemaCharacters
  ) {
    return {
      status: 'assistance-unavailable',
      failure: failure('INVALID_REQUEST', 'Schema assistance exceeds advertised Harnex capability limits.'),
    };
  }

  const generated = await client.generate({
    useCaseId: HARNEX_SCHEMA_INFERENCE_USE_CASE,
    input,
    jsonSchema,
  });
  if (generated.status === 'failed') {
    return { status: 'assistance-unavailable', failure: generated.failure };
  }
  if (signal?.aborted) return { status: 'assistance-unavailable', failure: cancelledFailure() };
  return parseModelOutcome(generated.answer, profile);
}

export async function inferImportV2SchemaWithHarnex(
  profile: SpreadsheetProfile,
  options: InferImportV2SchemaOptions = {},
): Promise<ImportV2SchemaInferenceOutcome> {
  const client = options.client ?? harnexClient;
  const profileForInference = visibleProfile(profile);
  if (!hasViableHeader(profileForInference)) return { status: 'unsupported' };
  if (options.signal?.aborted) {
    return { status: 'assistance-unavailable', failure: cancelledFailure() };
  }

  let connected = false;
  let outcome: ImportV2SchemaInferenceOutcome = {
    status: 'assistance-unavailable',
    failure: failure('RUNTIME_FAILURE', 'Schema assistance failed.'),
  };
  const onAbort = () => { void client.cancel(); };
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const connection = await client.connect();
    if (connection.status === 'unavailable') {
      outcome = { status: 'assistance-unavailable', failure: connection.failure };
    } else {
      connected = true;
      outcome = await runConnectedInference(profileForInference, client, options.signal);
    }
  } catch {
    outcome = {
      status: 'assistance-unavailable',
      failure: failure('RUNTIME_FAILURE', 'Schema assistance failed.'),
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
          failure: failure('RUNTIME_FAILURE', 'Schema assistance cleanup failed.'),
        };
      }
    }
  }

  return outcome;
}
