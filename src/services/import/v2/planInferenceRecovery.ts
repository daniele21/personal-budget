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

const ROLE_GUIDE = {
  evidence: 'Header semantics and sampled value shapes are both relevant. Header labels can be localized.',
  date: 'Transaction date means booking, operation, posting, or value date. Examples include Date, Data Operazione, Fecha, and Datum when the values are date-shaped.',
  description: 'Description means merchant, payee, counterparty, memo, reason, or causale; descriptive text is distinct from date, amount, currency, and direction fields.',
  debitCredit: 'Separate outflow and inflow columns map to debit-credit. Examples include Debit/Credit, Uscite/Entrate, and Dare/Avere; outflow is debit and inflow is credit.',
  delimitedCell: 'In a delimited-cell layout, the delimiter separates fields inside each source row and should split the same source cell position consistently across header and sampled data rows.',
  ambiguity: 'Ambiguous means at least two incompatible supported plans remain plausible after considering the supplied evidence; uncertainty alone is not a second plausible plan.',
} as const;

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

  return JSON.stringify({
    ...parsed,
    roleGuide: ROLE_GUIDE,
    ...(retryAmbiguities ? {
      ambiguityRetry: {
        previousAmbiguities: retryAmbiguities,
        goal: 'A second evaluation of the same evidence using the role guide, producing a complete supported plan when only one remains plausible.',
      },
    } : {}),
  });
}

function guidedClient(
  base: HarnexClient,
  retryAmbiguities?: readonly ImportV2PlanInferenceAmbiguity[],
): HarnexClient {
  return {
    connect: () => base.connect(),
    probe: (useCaseId) => base.probe(useCaseId),
    generate: (request: HarnexGenerationRequest) => base.generate(
      request.useCaseId === HARNEX_SCHEMA_INFERENCE_USE_CASE
        ? { ...request, input: augmentInterpretationInput(request.input, retryAmbiguities) }
        : request,
    ),
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
