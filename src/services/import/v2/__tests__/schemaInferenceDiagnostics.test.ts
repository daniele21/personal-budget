import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileSpreadsheet } from '../../../../domain/import/v2';
import {
  getImportV2Diagnostics,
  resetImportV2DiagnosticsForTests,
} from '../../../../lib/importV2Diagnostics';
import type { HarnexClient } from '../../../../platform/harnex';
import { inferImportV2SchemaWithHarnex } from '../schemaInferenceDiagnostics';

function fakeClient(answer: string): HarnexClient {
  return {
    connect: vi.fn(async () => ({ status: 'connected' })),
    probe: vi.fn(async () => ({
      status: 'available',
      maxInputCharacters: 12_000,
      maxJsonSchemaCharacters: 4_096,
    })),
    generate: vi.fn(async () => ({
      status: 'completed',
      answer,
      metrics: { totalMs: 5 },
    })),
    cancel: vi.fn(async () => ({ cancelled: true })),
    disconnect: vi.fn(async () => ({ status: 'disconnected' })),
  };
}

const profile = profileSpreadsheet({
  sourceKind: 'csv',
  csvDelimiter: ',',
  sheets: [{
    id: 'sheet-1',
    name: 'CSV',
    state: 'visible',
    rows: [
      { rowNumber: 1, cells: ['When', 'Memo', 'Value'] },
      { rowNumber: 2, cells: ['2026-09-01', 'SENSITIVE-SAMPLE', '-42.00'] },
      { rowNumber: 3, cells: ['2026-09-02', 'SECOND-SAMPLE', '-18.00'] },
    ],
    totalNonEmptyRows: 3,
    samplesTruncated: false,
  }],
});

describe('Import V2 schema inference diagnostics', () => {
  beforeEach(() => {
    resetImportV2DiagnosticsForTests();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('records candidate-space counts and the model outcome without financial content', async () => {
    const outcome = await inferImportV2SchemaWithHarnex(
      profile,
      { client: fakeClient(JSON.stringify({ status: 'unsupported' })) },
    );

    expect(outcome).toEqual({ status: 'unsupported' });
    const diagnostics = getImportV2Diagnostics();
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        stage: 'schema-profile',
        result: 'profiled',
        details: expect.objectContaining({
          sourceKind: 'csv',
          visibleSheets: 1,
          profiledHeaders: expect.any(Number),
          safeColumns: expect.any(Number),
          dateCandidates: expect.any(Number),
          amountCandidates: expect.any(Number),
          descriptionCandidates: expect.any(Number),
          resolvableHeaders: expect.any(Number),
          resolvedBranch: expect.any(Boolean),
        }),
      }),
      expect.objectContaining({
        stage: 'schema-outcome',
        result: 'unsupported',
        details: expect.objectContaining({ reasonCode: 'model-unsupported' }),
      }),
    ]));

    const serialized = JSON.stringify(diagnostics);
    expect(serialized).not.toContain('SENSITIVE-SAMPLE');
    expect(serialized).not.toContain('SECOND-SAMPLE');
    expect(serialized).not.toContain('2026-09-01');
    expect(serialized).not.toContain('-42.00');
  });

  it('distinguishes a profile with no header candidates from a model unsupported result', async () => {
    const emptyProfile = {
      ...profile,
      sheets: profile.sheets.map((sheet) => ({ ...sheet, headerCandidates: [] })),
    };

    await expect(inferImportV2SchemaWithHarnex(emptyProfile, {
      client: fakeClient(JSON.stringify({ status: 'unsupported' })),
    })).resolves.toEqual({ status: 'unsupported' });

    expect(getImportV2Diagnostics()).toContainEqual(expect.objectContaining({
      stage: 'schema-outcome',
      result: 'unsupported',
      details: expect.objectContaining({ reasonCode: 'no-profiled-header' }),
    }));
  });
});
