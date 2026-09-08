import { describe, expect, it } from 'vitest';
import {
  EMPTY_IMPORT_V2_MAPPING,
  getImportV2TaskActions,
  isImportV2MappingComplete,
  transitionImportV2Task,
  type ImportV2MappingDraft,
  type ImportV2TaskState,
} from '../importV2TaskState';

const COMPLETE_MAPPING: ImportV2MappingDraft = {
  dateCandidateId: 'date:0:iso-date',
  amountCandidateId: 'amount:2:signed-negative-expense',
  descriptionColumnIds: ['column:1'],
  typeColumnId: null,
};

describe('Import V2 task state contract', () => {
  it('requires explicit mapping confirmation before transaction checks', () => {
    const analyzing = transitionImportV2Task({ kind: 'idle', step: 'upload' }, { type: 'start-local-analysis' });
    const mapping = transitionImportV2Task(analyzing, {
      type: 'mapping-ready',
      resolution: 'ambiguous',
      origin: 'assisted',
      mapping: COMPLETE_MAPPING,
      issues: ['Two amount interpretations are possible.'],
    });

    expect(mapping).toMatchObject({ kind: 'mapping-review', resolution: 'ambiguous' });
    expect(getImportV2TaskActions(mapping)).toContain('confirm-mapping');

    const checked = transitionImportV2Task(mapping, { type: 'confirm-mapping' });
    expect(checked).toEqual({ kind: 'checking-transactions', step: 'check-transactions' });
  });

  it('does not advance an incomplete manual mapping', () => {
    const state: ImportV2TaskState = {
      kind: 'mapping-review',
      step: 'understand-file',
      resolution: 'ambiguous',
      origin: 'manual',
      mapping: EMPTY_IMPORT_V2_MAPPING,
      issues: [],
    };

    expect(isImportV2MappingComplete(state.mapping)).toBe(false);
    expect(getImportV2TaskActions(state)).not.toContain('confirm-mapping');
    expect(transitionImportV2Task(state, { type: 'confirm-mapping' })).toBe(state);
  });

  it('keeps manual mapping first-class when assistance is unavailable', () => {
    const unavailable: ImportV2TaskState = {
      kind: 'assistance-unavailable',
      step: 'understand-file',
      reason: 'host-missing',
    };

    expect(getImportV2TaskActions(unavailable)).toEqual(['continue-manually', 'retry', 'cancel']);

    const manual = transitionImportV2Task(unavailable, { type: 'continue-manually' });
    expect(manual).toMatchObject({
      kind: 'mapping-review',
      resolution: 'ambiguous',
      origin: 'manual',
      mapping: EMPTY_IMPORT_V2_MAPPING,
    });
  });

  it('preserves completed classification work on partial failure and allows recovery', () => {
    const progress: ImportV2TaskState = {
      kind: 'classification-progress',
      step: 'categorize',
      completed: 3,
      total: 8,
    };

    const partial = transitionImportV2Task(progress, {
      type: 'classification-partial-failure',
      completed: 5,
      failed: 3,
    });

    expect(partial).toEqual({
      kind: 'classification-partial-failure',
      step: 'categorize',
      completed: 5,
      failed: 3,
      total: 8,
    });
    expect(getImportV2TaskActions(partial)).toEqual(['continue-manually', 'retry', 'cancel']);
    expect(transitionImportV2Task(partial, { type: 'retry' })).toEqual({
      kind: 'classification-progress',
      step: 'categorize',
      completed: 5,
      total: 8,
    });
    expect(transitionImportV2Task(partial, { type: 'continue-manually' })).toEqual({ kind: 'review', step: 'review' });
  });

  it('supports cancellation without treating it as a ledger commit', () => {
    const progress: ImportV2TaskState = {
      kind: 'classification-progress',
      step: 'categorize',
      completed: 2,
      total: 4,
    };

    const cancelled = transitionImportV2Task(progress, { type: 'cancel' });
    expect(cancelled).toEqual({ kind: 'cancelled', step: 'categorize' });
    expect(getImportV2TaskActions(cancelled)).toEqual(['continue-manually', 'retry']);
    expect(transitionImportV2Task(cancelled, { type: 'continue-manually' })).toEqual({ kind: 'review', step: 'review' });
  });

  it('requires retry when deterministic transaction checks are cancelled', () => {
    const checking: ImportV2TaskState = { kind: 'checking-transactions', step: 'check-transactions' };
    const cancelled = transitionImportV2Task(checking, { type: 'cancel' });

    expect(cancelled).toEqual({ kind: 'cancelled', step: 'check-transactions' });
    expect(getImportV2TaskActions(cancelled)).toEqual(['retry']);
    expect(transitionImportV2Task(cancelled, { type: 'continue-manually' })).toBe(cancelled);
    expect(transitionImportV2Task(cancelled, { type: 'retry' })).toEqual({
      kind: 'checking-transactions',
      step: 'check-transactions',
    });
  });

  it('moves directly to review when there is nothing to categorize', () => {
    const checked: ImportV2TaskState = { kind: 'checking-transactions', step: 'check-transactions' };
    expect(transitionImportV2Task(checked, { type: 'transactions-checked', totalToCategorize: 0 })).toEqual({
      kind: 'review',
      step: 'review',
    });
  });
});
