import { describe, expect, it, vi } from 'vitest';
import type {
  ImportV2RawDocument,
  ImportV2TransformationPlan,
} from '../../../../domain/import/v2';
import type { HarnexClient } from '../../../../platform/harnex';
import { inferImportV2PlanWithHarnex } from '../planInferenceRecovery';

const document: ImportV2RawDocument = {
  contractVersion: 1,
  sourceKind: 'csv',
  sheets: [{
    id: 'sheet-1',
    name: 'CSV',
    state: 'visible',
    rows: [
      { rowNumber: 1, cells: ['Data Operazione;Causale;Uscite;Entrate'] },
      { rowNumber: 2, cells: ['12/09/2026;SUPERMERCATO;43,20;'] },
      { rowNumber: 3, cells: ['13/09/2026;STIPENDIO;;2100,00'] },
    ],
    totalNonEmptyRows: 3,
    samplesTruncated: false,
  }],
};

const plan: ImportV2TransformationPlan = {
  contractVersion: 1,
  sheetId: 'sheet-1',
  layout: {
    kind: 'delimited-cell',
    sourceColumnIndex: 0,
    delimiter: ';',
    stripOuterQuotes: false,
    headerRowNumber: 1,
    firstDataRowNumber: 2,
  },
  date: { columnIndex: 0, parser: 'dmy-slash' },
  description: { columnIndexes: [1] },
  amount: { strategy: 'debit-credit', debitColumnIndex: 2, creditColumnIndex: 3 },
};

function fakeClient(answers: readonly string[], maxInputCharacters = 50_000): HarnexClient {
  let answerIndex = 0;
  return {
    connect: vi.fn<HarnexClient['connect']>(async () => ({ status: 'connected' })),
    probe: vi.fn<HarnexClient['probe']>(async () => ({
      status: 'available',
      maxInputCharacters,
      maxJsonSchemaCharacters: 20_000,
    })),
    generate: vi.fn<HarnexClient['generate']>(async () => {
      const answer = answers[Math.min(answerIndex, answers.length - 1)]!;
      answerIndex += 1;
      return { status: 'completed', answer, metrics: { totalMs: 7 } };
    }),
    cancel: vi.fn<HarnexClient['cancel']>(async () => ({ cancelled: true })),
    disconnect: vi.fn<HarnexClient['disconnect']>(async () => ({ status: 'disconnected' })),
  };
}

function resolved(): string {
  return JSON.stringify({ status: 'resolved', plan });
}

describe('guided Harnex plan inference recovery', () => {
  it('adds semantic rules and performs one bounded retry for model ambiguity', async () => {
    const client = fakeClient([
      JSON.stringify({ status: 'ambiguous', ambiguities: ['date', 'description', 'amount'] }),
      resolved(),
    ]);

    await expect(inferImportV2PlanWithHarnex(document, {
      client,
      today: '2026-09-30',
      proposalIdFactory: () => 'proposal-guided',
    })).resolves.toEqual({
      status: 'resolved',
      proposal: expect.objectContaining({
        proposalId: 'proposal-guided',
        plan,
        unresolvedSourceRowNumbers: [],
      }),
    });

    expect(client.generate).toHaveBeenCalledTimes(2);
    expect(client.connect).toHaveBeenCalledTimes(2);
    expect(client.disconnect).toHaveBeenCalledTimes(2);

    const firstInput = JSON.parse(vi.mocked(client.generate).mock.calls[0]![0].input) as {
      rules?: string[];
      previousAmbiguities?: unknown;
    };
    expect(firstInput.rules).toEqual(expect.arrayContaining([
      expect.stringContaining('Uscite/Entrate'),
      expect.stringContaining('causale'),
      expect.stringContaining('Low confidence'),
    ]));
    expect(firstInput.previousAmbiguities).toBeUndefined();

    const retryInput = JSON.parse(vi.mocked(client.generate).mock.calls[1]![0].input) as {
      rules?: string[];
      previousAmbiguities?: string[];
    };
    expect(retryInput.previousAmbiguities).toEqual(['date', 'description', 'amount']);
    expect(retryInput.rules).toEqual(expect.arrayContaining([
      expect.stringContaining('bounded re-evaluation'),
    ]));
  });

  it('does not retry invalid model output', async () => {
    const client = fakeClient(['not-json']);
    await expect(inferImportV2PlanWithHarnex(document, { client })).resolves.toEqual({
      status: 'ambiguous',
      ambiguities: ['invalid-response'],
    });
    expect(client.generate).toHaveBeenCalledTimes(1);
  });

  it('does not silently repeat a user-requested revision', async () => {
    const client = fakeClient([
      JSON.stringify({ status: 'ambiguous', ambiguities: ['amount'] }),
      resolved(),
    ]);
    await expect(inferImportV2PlanWithHarnex(document, {
      client,
      feedback: { area: 'amount' },
    })).resolves.toEqual({ status: 'ambiguous', ambiguities: ['amount'] });
    expect(client.generate).toHaveBeenCalledTimes(1);
  });

  it('falls back to the already-bounded request when semantic guidance would exceed Harnex input limits', async () => {
    const wideClient = fakeClient([resolved()]);
    await inferImportV2PlanWithHarnex(document, { client: wideClient });
    const originalLength = JSON.parse(vi.mocked(wideClient.generate).mock.calls[0]![0].input).document
      ? vi.mocked(wideClient.generate).mock.calls[0]![0].input.length
      : 0;

    const limitedClient = fakeClient([resolved()], originalLength - 1);
    await inferImportV2PlanWithHarnex(document, { client: limitedClient });
    const limitedInput = JSON.parse(vi.mocked(limitedClient.generate).mock.calls[0]![0].input) as {
      rules?: string[];
    };
    expect(limitedInput.rules?.some((rule) => rule.includes('Uscite/Entrate'))).toBe(false);
  });
});
