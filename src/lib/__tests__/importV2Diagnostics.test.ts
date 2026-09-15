import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginImportV2DiagnosticAttempt,
  getImportV2Diagnostics,
  recordImportV2Diagnostic,
  resetImportV2DiagnosticsForTests,
} from '../importV2Diagnostics';

describe('Import V2 diagnostics', () => {
  beforeEach(() => {
    resetImportV2DiagnosticsForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits a correlated content-free structured trace', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const attemptId = beginImportV2DiagnosticAttempt('csv');

    recordImportV2Diagnostic('schema-profile', 'profiled', {
      sourceKind: 'csv',
      visibleSheets: 1,
      profiledHeaders: 1,
      safeColumns: 3,
      dateCandidates: 0,
      amountCandidates: 2,
      descriptionCandidates: 1,
      resolvableHeaders: 0,
      resolvedBranch: false,
    });
    recordImportV2Diagnostic('schema-outcome', 'unsupported', {
      reasonCode: 'model-unsupported',
    });

    const diagnostics = getImportV2Diagnostics();
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.every((event) => event.attemptId === attemptId)).toBe(true);
    expect(diagnostics.map((event) => [event.stage, event.result])).toEqual([
      ['attempt', 'started'],
      ['schema-profile', 'profiled'],
      ['schema-outcome', 'unsupported'],
    ]);
    expect(info).toHaveBeenCalledTimes(3);
    expect(String(info.mock.calls[0]?.[0])).toBe('[AuraImportV2]');

    const serialized = JSON.stringify(diagnostics);
    expect(serialized).not.toContain('bank.csv');
    expect(serialized).not.toContain('Coffee shop');
    expect(serialized).not.toContain('2026-09-01');
    expect(serialized).not.toContain('-42.00');
  });

  it('deduplicates consecutive identical projection events', () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    beginImportV2DiagnosticAttempt('csv');

    recordImportV2Diagnostic('mapping-options', 'incomplete', {
      sourceKind: 'csv',
      dateOptions: 0,
      amountOptions: 3,
      descriptionOptions: 2,
    });
    recordImportV2Diagnostic('mapping-options', 'incomplete', {
      sourceKind: 'csv',
      dateOptions: 0,
      amountOptions: 3,
      descriptionOptions: 2,
    });

    expect(getImportV2Diagnostics().filter((event) => event.stage === 'mapping-options')).toHaveLength(1);
  });
});
