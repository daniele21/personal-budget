export const IMPORT_V2_TASK_STEPS = [
  'upload',
  'understand-file',
  'check-transactions',
  'categorize',
  'review',
  'done',
] as const;

export type ImportV2TaskStep = (typeof IMPORT_V2_TASK_STEPS)[number];

export type ImportV2AssistanceFailureReason =
  | 'harnex-unavailable'
  | 'host-missing'
  | 'unauthorized'
  | 'use-case-unready'
  | 'model-unready'
  | 'offline';

export interface ImportV2MappingDraft {
  dateCandidateId: string | null;
  amountCandidateId: string | null;
  descriptionColumnIds: readonly string[];
  typeColumnId: string | null;
}

export const EMPTY_IMPORT_V2_MAPPING: ImportV2MappingDraft = {
  dateCandidateId: null,
  amountCandidateId: null,
  descriptionColumnIds: [],
  typeColumnId: null,
};

export type ImportV2TaskState =
  | { kind: 'idle'; step: 'upload' }
  | { kind: 'local-analysis'; step: 'understand-file' }
  | {
      kind: 'mapping-review';
      step: 'understand-file';
      resolution: 'resolved' | 'ambiguous';
      origin: 'assisted' | 'manual';
      mapping: ImportV2MappingDraft;
      issues: readonly string[];
    }
  | { kind: 'checking-transactions'; step: 'check-transactions' }
  | {
      kind: 'assistance-unavailable';
      step: 'understand-file' | 'categorize';
      reason: ImportV2AssistanceFailureReason;
    }
  | {
      kind: 'classification-progress';
      step: 'categorize';
      completed: number;
      total: number;
    }
  | {
      kind: 'classification-partial-failure';
      step: 'categorize';
      completed: number;
      failed: number;
      total: number;
    }
  | {
      kind: 'cancelled';
      step: 'understand-file' | 'check-transactions' | 'categorize';
    }
  | { kind: 'review'; step: 'review' }
  | { kind: 'success'; step: 'done'; importedCount: number };

export type ImportV2TaskEvent =
  | { type: 'start-local-analysis' }
  | {
      type: 'mapping-ready';
      resolution: 'resolved' | 'ambiguous';
      origin: 'assisted' | 'manual';
      mapping: ImportV2MappingDraft;
      issues?: readonly string[];
    }
  | { type: 'assistance-unavailable'; step: 'understand-file' | 'categorize'; reason: ImportV2AssistanceFailureReason }
  | { type: 'confirm-mapping' }
  | { type: 'transactions-checked'; totalToCategorize: number }
  | { type: 'classification-progress'; completed: number }
  | { type: 'classification-partial-failure'; completed: number; failed: number }
  | { type: 'classification-complete' }
  | { type: 'retry' }
  | { type: 'continue-manually' }
  | { type: 'cancel' }
  | { type: 'complete-review'; importedCount: number };

export type ImportV2TaskAction =
  | 'confirm-mapping'
  | 'retry'
  | 'continue-manually'
  | 'cancel';

export function isImportV2MappingComplete(mapping: ImportV2MappingDraft): boolean {
  return Boolean(
    mapping.dateCandidateId
    && mapping.amountCandidateId
    && mapping.descriptionColumnIds.length > 0,
  );
}

export function getImportV2TaskActions(state: ImportV2TaskState): readonly ImportV2TaskAction[] {
  switch (state.kind) {
    case 'mapping-review':
      return isImportV2MappingComplete(state.mapping) ? ['confirm-mapping', 'cancel'] : ['cancel'];
    case 'assistance-unavailable':
    case 'classification-partial-failure':
      return ['continue-manually', 'retry', 'cancel'];
    case 'local-analysis':
    case 'checking-transactions':
    case 'classification-progress':
      return ['cancel'];
    case 'cancelled':
      return state.step === 'check-transactions' ? ['retry'] : ['continue-manually', 'retry'];
    case 'idle':
    case 'review':
    case 'success':
      return [];
  }
}

function clampProgress(value: number, total: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.floor(value), total));
}

function retryState(state: ImportV2TaskState): ImportV2TaskState {
  if (state.kind === 'assistance-unavailable') {
    if (state.step === 'understand-file') return { kind: 'local-analysis', step: 'understand-file' };
    return { kind: 'classification-progress', step: 'categorize', completed: 0, total: 0 };
  }
  if (state.kind === 'classification-partial-failure') {
    return {
      kind: 'classification-progress',
      step: 'categorize',
      completed: state.completed,
      total: state.total,
    };
  }
  if (state.kind === 'cancelled') {
    if (state.step === 'understand-file') return { kind: 'local-analysis', step: 'understand-file' };
    if (state.step === 'check-transactions') return { kind: 'checking-transactions', step: 'check-transactions' };
    return { kind: 'classification-progress', step: 'categorize', completed: 0, total: 0 };
  }
  return state;
}

function manualFallbackState(state: ImportV2TaskState): ImportV2TaskState {
  if (
    (state.kind === 'assistance-unavailable' && state.step === 'understand-file')
    || (state.kind === 'cancelled' && state.step === 'understand-file')
  ) {
    return {
      kind: 'mapping-review',
      step: 'understand-file',
      resolution: 'ambiguous',
      origin: 'manual',
      mapping: EMPTY_IMPORT_V2_MAPPING,
      issues: ['Choose the columns Aura should use before continuing.'],
    };
  }

  if (
    state.kind === 'classification-partial-failure'
    || (state.kind === 'assistance-unavailable' && state.step === 'categorize')
    || (state.kind === 'cancelled' && state.step === 'categorize')
  ) {
    return { kind: 'review', step: 'review' };
  }

  return state;
}

export function transitionImportV2Task(
  state: ImportV2TaskState,
  event: ImportV2TaskEvent,
): ImportV2TaskState {
  switch (event.type) {
    case 'start-local-analysis':
      return state.kind === 'idle' ? { kind: 'local-analysis', step: 'understand-file' } : state;

    case 'mapping-ready':
      if (state.step !== 'understand-file') return state;
      return {
        kind: 'mapping-review',
        step: 'understand-file',
        resolution: event.resolution,
        origin: event.origin,
        mapping: event.mapping,
        issues: event.issues ?? [],
      };

    case 'assistance-unavailable':
      if (state.kind === 'success' || state.kind === 'review') return state;
      return { kind: 'assistance-unavailable', step: event.step, reason: event.reason };

    case 'confirm-mapping':
      if (state.kind !== 'mapping-review' || !isImportV2MappingComplete(state.mapping)) return state;
      return { kind: 'checking-transactions', step: 'check-transactions' };

    case 'transactions-checked': {
      if (state.kind !== 'checking-transactions') return state;
      const total = Math.max(0, Math.floor(event.totalToCategorize));
      return total === 0
        ? { kind: 'review', step: 'review' }
        : { kind: 'classification-progress', step: 'categorize', completed: 0, total };
    }

    case 'classification-progress':
      if (state.kind !== 'classification-progress') return state;
      return { ...state, completed: clampProgress(event.completed, state.total) };

    case 'classification-partial-failure':
      if (state.kind !== 'classification-progress') return state;
      return {
        kind: 'classification-partial-failure',
        step: 'categorize',
        completed: clampProgress(event.completed, state.total),
        failed: Math.max(0, Math.floor(event.failed)),
        total: state.total,
      };

    case 'classification-complete':
      return state.kind === 'classification-progress' ? { kind: 'review', step: 'review' } : state;

    case 'retry':
      return retryState(state);

    case 'continue-manually':
      return manualFallbackState(state);

    case 'cancel':
      if (
        state.kind === 'local-analysis'
        || state.kind === 'checking-transactions'
        || state.kind === 'classification-progress'
        || state.kind === 'classification-partial-failure'
        || state.kind === 'assistance-unavailable'
        || state.kind === 'mapping-review'
      ) {
        return { kind: 'cancelled', step: state.step };
      }
      return state;

    case 'complete-review':
      return state.kind === 'review'
        ? { kind: 'success', step: 'done', importedCount: Math.max(0, Math.floor(event.importedCount)) }
        : state;
  }
}
