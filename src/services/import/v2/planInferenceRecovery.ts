import type { ImportV2RawDocument } from '../../../domain/import/v2';
import {
  HARNEX_SCHEMA_INFERENCE_USE_CASE,
  harnexClient,
  type HarnexClient,
  type HarnexGenerationRequest,
} from '../../../platform/harnex';
import {
  inferImportV2PlanWithHarnex as inferImportV2PlanOnce,
  type InferImportV2PlanOptions,
  type ImportV2PlanInferenceAmbiguity,
  type ImportV2PlanInferenceOutcome,
} from './planInference';

const RETRYABLE_AMBIGUITIES = new Set<ImportV2PlanInferenceAmbiguity>([
  'sheet',
  'layout',
  'date',
  'description',
  'amount',
]);

const SEMANTIC_RULES = [
  'Use header meaning and sampled value shapes together. Header labels may be localized; do not require English names.',
  'Transaction date means the booking, operation, posting, or value date. Labels such as Date, Data Operazione, Fecha, or Datum are evidence when sampled values are date-shaped.',
  'Description means merchant, payee, counterparty, memo, reason, or causale. Prefer descriptive text fields over date, amount, currency, or direction fields.',
  'When separate outflow and inflow columns exist, use debit-credit. Examples include Debit/Credit, Uscite/Entrate, and Dare/Avere; the outflow column is debit and the inflow column is credit.',
  'For delimited-cell, the delimiter separates fields inside each source row. Select it only when the same source cell position splits consistently across the header and sampled data rows.',
  'Return ambiguous only when at least two incompatible supported plans remain plausible after considering the supplied headers and samples. Low confidence by itself is not a second plausible plan.',
  'Never select a parser, semantic column, or amount strategy when sampled values contradict that interpretation.',
] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function augmentInterpretationInput(
  input: string,
  retryAmbiguities?: readonly ImportV2PlanInferenceAmbiguity[],
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return input;
  }
  if (!isRecord(parsed) || parsed.task !== 'interpret-transaction-source') return input;

  const rules = Array.isArray(parsed.rules)
    ? parsed.rules.filter((rule): rule is string => typeof rule === 'string')
    : [];
  return JSON.stringify({
    ...parsed,
    rules: [
      ...rules,
      ...SEMANTIC_RULES,
      ...(retryAmbiguities ? [
        `This is one bounded re-evaluation after ambiguities ${retryAmbiguities.join(', ')}. Re-evaluate the same source using the semantic rules and return a complete supported plan when only one remains plausible.`,
      ] : []),
    ],
    ...(retryAmbiguities ? { previousAmbiguities: retryAmbiguities } : {}),
  });
}

function guidedClient(
  base: HarnexClient,
  retryAmbiguities?: readonly ImportV2PlanInferenceAmbiguity[],
): HarnexClient {
  let maxInputCharacters: number | null = null;
  return {
    connect: () => base.connect(),
    async probe(useCaseId) {
      const capability = await base.probe(useCaseId);
      maxInputCharacters = capability.status === 'available'
        ? capability.maxInputCharacters
        : null;
      return capability;
    },
    generate: (request: HarnexGenerationRequest) => {
      if (request.useCaseId !== HARNEX_SCHEMA_INFERENCE_USE_CASE) return base.generate(request);
      const augmented = augmentInterpretationInput(request.input, retryAmbiguities);
      const input = maxInputCharacters != null && augmented.length > maxInputCharacters
        ? request.input
        : augmented;
      return base.generate({ ...request, input });
    },
    cancel: () => base.cancel(),
    disconnect: () => base.disconnect(),
  };
}

function shouldRetry(outcome: ImportV2PlanInferenceOutcome): outcome is Extract<
  ImportV2PlanInferenceOutcome,
  { status: 'ambiguous' }
> {
  return outcome.status === 'ambiguous'
    && outcome.ambiguities.length > 0
    && outcome.ambiguities.every((ambiguity) => RETRYABLE_AMBIGUITIES.has(ambiguity));
}

/**
 * Production-facing plan inference wrapper. The accepted transformation-plan
 * validator/executor remains unchanged. This layer only strengthens the bounded
 * semantic instructions seen by the real local model and performs at most one
 * second pass for a structurally valid ambiguity. Invalid output/plan/preview
 * failures and user-requested revisions are never retried automatically.
 */
export async function inferImportV2PlanWithHarnex(
  rawDocument: ImportV2RawDocument,
  options: InferImportV2PlanOptions = {},
): Promise<ImportV2PlanInferenceOutcome> {
  const { client: requestedClient, ...baseOptions } = options;
  const client = requestedClient ?? harnexClient;

  const first = await inferImportV2PlanOnce(rawDocument, {
    ...baseOptions,
    client: guidedClient(client),
  });
  if (baseOptions.feedback || baseOptions.signal?.aborted || !shouldRetry(first)) return first;

  return inferImportV2PlanOnce(rawDocument, {
    ...baseOptions,
    client: guidedClient(client, first.ambiguities),
  });
}
