import { describe, expect, it, vi } from 'vitest';
import type { SpreadsheetProfile } from '../../../../domain/import/v2';
import type {
  HarnexClient,
  HarnexGenerationResult,
} from '../../../../platform/harnex';
import { inferImportV2SchemaWithHarnex } from '../schemaInference';

function column(
  id: string,
  columnIndex: number,
  header: string,
  samples: string[],
) {
  return {
    id,
    columnIndex,
    header,
    nonEmptyCount: 3,
    nonEmptyRatio: 1,
    textRatio: header === 'Description' ? 1 : 0,
    numericRatio: header === 'Amount' ? 1 : 0,
    dateLikeRatio: header === 'Date' ? 1 : 0,
    positiveNumericRatio: 0,
    negativeNumericRatio: header === 'Amount' ? 1 : 0,
    formulaCount: 0,
    mergedCellCount: 0,
    directionRatio: 0,
    dateParsers: header === 'Date' ? ['iso-date' as const] : [],
    samples,
  };
}

function header(prefix: string, secretSample?: string) {
  const dateId = `${prefix}-date-column`;
  const descriptionId = `${prefix}-description-column`;
  const amountId = `${prefix}-amount-column`;
  return {
    id: `${prefix}-header`,
    rowNumber: 1,
    score: 1,
    columns: [
      column(dateId, 0, 'Date', ['2026-09-01']),
      column(descriptionId, 1, 'Description', [secretSample ?? 'Coffee shop']),
      column(amountId, 2, 'Amount', ['-4.50']),
    ],
    dateCandidates: [{ id: `${prefix}-date`, columnId: dateId, parser: 'iso-date' as const }],
    amountCandidates: [{
      id: `${prefix}-amount`,
      strategy: 'signed-negative-expense' as const,
      columnId: amountId,
    }],
    descriptionCandidateColumnIds: [descriptionId],
  };
}

function profile(): SpreadsheetProfile {
  return {
    sourceKind: 'csv',
    csvDelimiter: ',',
    sheets: [
      {
        id: 'visible-sheet',
        name: 'Transactions',
        state: 'visible',
        totalNonEmptyRows: 4,
        samplesTruncated: false,
        headerCandidates: [header('visible')],
      },
      {
        id: 'hidden-sheet',
        name: 'Hidden account data',
        state: 'hidden',
        totalNonEmptyRows: 4,
        samplesTruncated: false,
        headerCandidates: [header('hidden', 'SECRET-HIDDEN-SAMPLE')],
      },
    ],
  };
}

function resolvedAnswer(prefix = 'visible'): string {
  return JSON.stringify({
    status: 'resolved',
    sheetId: `${prefix}-sheet`,
    headerCandidateId: `${prefix}-header`,
    dateCandidateId: `${prefix}-date`,
    descriptionColumnIds: [`${prefix}-description-column`],
    amountCandidateId: `${prefix}-amount`,
  });
}

function fakeClient(answer = resolvedAnswer()) {
  return {
    connect: vi.fn(async () => ({ status: 'connected' as const })),
    probe: vi.fn(async () => ({
      status: 'available' as const,
      maxInputCharacters: 12_000,
      maxJsonSchemaCharacters: 4_096,
    })),
    generate: vi.fn(async () => ({
      status: 'completed' as const,
      answer,
      metrics: { totalMs: 5 },
    })),
    cancel: vi.fn(async () => ({ cancelled: true })),
    disconnect: vi.fn(async () => ({ status: 'disconnected' as const })),
  } satisfies HarnexClient;
}

describe('inferImportV2SchemaWithHarnex', () => {
  it('returns only a canonically validated mapping suggestion', async () => {
    const client = fakeClient();

    await expect(inferImportV2SchemaWithHarnex(profile(), { client })).resolves.toEqual({
      status: 'resolved',
      suggestion: {
        sheetId: 'visible-sheet',
        headerCandidateId: 'visible-header',
        selection: {
          dateCandidateId: 'visible-date',
          amountCandidateId: 'visible-amount',
          descriptionColumnIds: ['visible-description-column'],
          typeColumnId: null,
        },
      },
    });
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('removes hidden sheets from both payload and authoritative candidate set', async () => {
    const client = fakeClient(resolvedAnswer('hidden'));

    await expect(inferImportV2SchemaWithHarnex(profile(), { client })).resolves.toEqual({
      status: 'ambiguous',
      ambiguities: ['invalid-selection'],
    });

    const request = client.generate.mock.calls[0]?.[0];
    expect(request).toBeDefined();
    expect(request?.input).not.toContain('hidden-sheet');
    expect(request?.input).not.toContain('SECRET-HIDDEN-SAMPLE');
    expect(request?.jsonSchema).not.toContain('hidden-date');
  });

  it('fails closed for duplicate or unknown candidate selections', async () => {
    const duplicateClient = fakeClient(JSON.stringify({
      status: 'resolved',
      sheetId: 'visible-sheet',
      headerCandidateId: 'visible-header',
      dateCandidateId: 'visible-date',
      descriptionColumnIds: ['visible-description-column', 'visible-description-column'],
      amountCandidateId: 'visible-amount',
    }));
    await expect(inferImportV2SchemaWithHarnex(profile(), { client: duplicateClient })).resolves.toEqual({
      status: 'ambiguous',
      ambiguities: ['invalid-selection'],
    });

    const unknownClient = fakeClient(JSON.stringify({
      status: 'resolved',
      sheetId: 'visible-sheet',
      headerCandidateId: 'visible-header',
      dateCandidateId: 'unknown-date',
      descriptionColumnIds: ['visible-description-column'],
      amountCandidateId: 'visible-amount',
    }));
    await expect(inferImportV2SchemaWithHarnex(profile(), { client: unknownClient })).resolves.toEqual({
      status: 'ambiguous',
      ambiguities: ['invalid-selection'],
    });
  });

  it('preserves explicit ambiguous and unsupported model outcomes', async () => {
    const ambiguous = fakeClient(JSON.stringify({
      status: 'ambiguous',
      ambiguities: ['date', 'amount'],
    }));
    await expect(inferImportV2SchemaWithHarnex(profile(), { client: ambiguous })).resolves.toEqual({
      status: 'ambiguous',
      ambiguities: ['date', 'amount'],
    });

    const unsupported = fakeClient(JSON.stringify({ status: 'unsupported' }));
    await expect(inferImportV2SchemaWithHarnex(profile(), { client: unsupported })).resolves.toEqual({
      status: 'unsupported',
    });
  });

  it('does not generate when the bounded request exceeds advertised capability', async () => {
    const client = fakeClient();
    client.probe.mockResolvedValue({
      status: 'available',
      maxInputCharacters: 10,
      maxJsonSchemaCharacters: 10,
    });

    await expect(inferImportV2SchemaWithHarnex(profile(), { client })).resolves.toMatchObject({
      status: 'assistance-unavailable',
      failure: { code: 'INVALID_REQUEST' },
    });
    expect(client.generate).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('preserves typed host/model availability failures and cleanup', async () => {
    const hostUnavailable = fakeClient();
    hostUnavailable.connect.mockResolvedValue({
      status: 'unavailable',
      failure: { code: 'HOST_NOT_INSTALLED', message: 'Host unavailable.' },
    });
    await expect(inferImportV2SchemaWithHarnex(profile(), { client: hostUnavailable })).resolves.toMatchObject({
      status: 'assistance-unavailable',
      failure: { code: 'HOST_NOT_INSTALLED' },
    });
    expect(hostUnavailable.disconnect).not.toHaveBeenCalled();

    const modelUnavailable = fakeClient();
    modelUnavailable.probe.mockResolvedValue({
      status: 'unavailable',
      failure: { code: 'MODEL_UNAVAILABLE', message: 'Model unavailable.' },
    });
    await expect(inferImportV2SchemaWithHarnex(profile(), { client: modelUnavailable })).resolves.toMatchObject({
      status: 'assistance-unavailable',
      failure: { code: 'MODEL_UNAVAILABLE' },
    });
    expect(modelUnavailable.disconnect).toHaveBeenCalledOnce();
  });

  it('cancels active generation through the bridge and still disconnects', async () => {
    const controller = new AbortController();
    let finishGeneration: ((result: HarnexGenerationResult) => void) | undefined;
    const client = fakeClient();
    client.generate.mockImplementation(() => new Promise<HarnexGenerationResult>((resolve) => {
      finishGeneration = resolve;
    }));
    client.cancel.mockImplementation(async () => {
      finishGeneration?.({
        status: 'failed',
        failure: { code: 'CANCELLED', message: 'Cancelled.' },
      });
      return { cancelled: true };
    });

    const inference = inferImportV2SchemaWithHarnex(profile(), {
      client,
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(client.generate).toHaveBeenCalledOnce());
    controller.abort();

    await expect(inference).resolves.toMatchObject({
      status: 'assistance-unavailable',
      failure: { code: 'CANCELLED' },
    });
    expect(client.cancel).toHaveBeenCalledOnce();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });
});
