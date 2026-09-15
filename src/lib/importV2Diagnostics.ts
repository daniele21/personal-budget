export const IMPORT_V2_DIAGNOSTIC_CONTRACT = 'import-v2-diagnostics-v1' as const;

export type ImportV2DiagnosticStage =
  | 'attempt'
  | 'file-route'
  | 'schema-profile'
  | 'schema-outcome'
  | 'harnex-connect'
  | 'harnex-probe'
  | 'harnex-generate'
  | 'harnex-cancel'
  | 'harnex-disconnect'
  | 'mapping-options';

export interface ImportV2DiagnosticDetails {
  sourceKind?: 'csv' | 'xlsx' | 'unknown';
  reasonCode?: string;
  failureCode?: string;
  ambiguityCodes?: string;
  useCaseId?: string;
  visibleSheets?: number;
  profiledHeaders?: number;
  safeColumns?: number;
  dateCandidates?: number;
  amountCandidates?: number;
  descriptionCandidates?: number;
  resolvableHeaders?: number;
  resolvedBranch?: boolean;
  inputCharacters?: number;
  jsonSchemaCharacters?: number;
  maxInputCharacters?: number;
  maxJsonSchemaCharacters?: number;
  totalMs?: number;
  outputTokens?: number;
  dateOptions?: number;
  amountOptions?: number;
  descriptionOptions?: number;
}

export interface ImportV2DiagnosticEvent {
  contract: typeof IMPORT_V2_DIAGNOSTIC_CONTRACT;
  attemptId: string;
  atMs: number;
  stage: ImportV2DiagnosticStage;
  result: string;
  details: ImportV2DiagnosticDetails;
}

const MAX_SESSION_EVENTS = 128;
const sessionEvents: ImportV2DiagnosticEvent[] = [];
let activeAttemptId: string | null = null;
let attemptSequence = 0;

function nextAttemptId(): string {
  attemptSequence += 1;
  return `import-${Date.now().toString(36)}-${attemptSequence.toString(36)}`;
}

function sameEvent(
  left: ImportV2DiagnosticEvent | undefined,
  right: ImportV2DiagnosticEvent,
): boolean {
  return Boolean(
    left
    && left.attemptId === right.attemptId
    && left.stage === right.stage
    && left.result === right.result
    && JSON.stringify(left.details) === JSON.stringify(right.details),
  );
}

export function beginImportV2DiagnosticAttempt(
  sourceKind: ImportV2DiagnosticDetails['sourceKind'] = 'unknown',
): string {
  activeAttemptId = nextAttemptId();
  recordImportV2Diagnostic('attempt', 'started', { sourceKind }, activeAttemptId);
  return activeAttemptId;
}

export function ensureImportV2DiagnosticAttempt(
  sourceKind: ImportV2DiagnosticDetails['sourceKind'] = 'unknown',
): string {
  return activeAttemptId ?? beginImportV2DiagnosticAttempt(sourceKind);
}

export function getActiveImportV2DiagnosticAttemptId(): string | null {
  return activeAttemptId;
}

export function recordImportV2Diagnostic(
  stage: ImportV2DiagnosticStage,
  result: string,
  details: ImportV2DiagnosticDetails = {},
  attemptId: string | null = activeAttemptId,
): void {
  if (!attemptId) return;

  const event: ImportV2DiagnosticEvent = {
    contract: IMPORT_V2_DIAGNOSTIC_CONTRACT,
    attemptId,
    atMs: Date.now(),
    stage,
    result,
    details: { ...details },
  };
  if (sameEvent(sessionEvents.at(-1), event)) return;

  sessionEvents.push(event);
  if (sessionEvents.length > MAX_SESSION_EVENTS) sessionEvents.shift();

  // Content-free by contract: callers may log only closed status/failure codes,
  // counts, payload sizes, capability limits and timing. Never pass filenames,
  // headers, sample cells, transaction data, categories, prompts or model output.
  console.info('[AuraImportV2]', JSON.stringify(event));
}

export function getImportV2Diagnostics(): readonly ImportV2DiagnosticEvent[] {
  return sessionEvents.map((event) => ({ ...event, details: { ...event.details } }));
}

export function resetImportV2DiagnosticsForTests(): void {
  sessionEvents.length = 0;
  activeAttemptId = null;
  attemptSequence = 0;
}
