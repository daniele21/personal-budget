import { describe, expect, it, vi } from 'vitest';
import type {
  ImportV2InterpretationProposal,
  ImportV2RawDocument,
  ImportV2TransformationPlan,
} from '../../../../domain/import/v2';
import type { HarnexClient } from '../../../../platform/harnex';
import { inferImportV2PlanWithHarnex } from '../planInference';

const document: ImportV2RawDocument = {
  contractVersion: 1,
  sourceKind: 'csv',
  sheets: [
    {
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
    },
    {
      id: 'hidden-sheet',
      name: 'Hidden',
      state: 'hidden',
      rows: [
        { rowNumber: 1, cells: ['SECRET-HIDDEN'] },
        { rowNumber: 2, cells: ['SECRET-HIDDEN-VALUE'] },
      ],
      totalNonEmptyRows: 2,
      samplesTruncated: false,
    },
  ],
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

function fakeClient(answer: string): HarnexClient {
  return {
    connect: vi.fn<HarnexClient['connect']>(async () => ({ status: 'connected' })),
    probe: vi.fn<HarnexClient['probe']>(async () => ({
      status: 'available',
      maxInputCharacters: 50_000,
      maxJsonSchemaCharacters: 20_000,
    })),
    generate: vi.fn<HarnexClient['generate']>(async () => ({
      status: 'completed', answer, metrics: { totalMs: 7 },
    })),
    cancel: vi.fn<HarnexClient['cancel']>(async () => ({ cancelled: true })),
    disconnect: vi.fn<HarnexClient['disconnect']>(async () => ({ status: 'disconnected' })),
  };
}

function resolved(planValue: unknown = plan): string {
  return JSON.stringify({ status: 'resolved', plan: planValue });
}

describe('inferImportV2PlanWithHarnex', () => {
  it('returns a deterministic proposal preview for a source shape Aura did not pre-map', async () => {
    const client = fakeClient(resolved());
    await expect(inferImportV2PlanWithHarnex(document, {
      client,
      today: '2026-09-30',
      proposalIdFactory: () => 'proposal-1',
    })).resolves.toEqual({
      status: 'resolved',
      proposal: expect.objectContaining({
        proposalId: 'proposal-1',
        plan,
        unresolvedSourceRowNumbers: [],
        preview: [
          expect.objectContaining({ date: '2026-09-12', signedAmountMinor: -4320 }),
          expect.objectContaining({ date: '2026-09-13', signedAmountMinor: 210000 }),
        ],
      }),
    });

    const request = vi.mocked(client.generate).mock.calls[0]![0];
    expect(request.input).toContain('Data Operazione;Causale;Uscite;Entrate');
    expect(request.input).not.toContain('SECRET-HIDDEN');
    expect(request.jsonSchema).toContain('delimited-cell');
    expect(request.jsonSchema).not.toContain('joinWith');
  });

  it('rejects model plans that reference an unknown source row or sheet', async () => {
    const invalidPlan = {
      ...plan,
      layout: { ...plan.layout, firstDataRowNumber: 99 },
    };
    await expect(inferImportV2PlanWithHarnex(document, {
      client: fakeClient(resolved(invalidPlan)),
    })).resolves.toEqual({ status: 'ambiguous', ambiguities: ['invalid-plan'] });
  });

  it('feeds a prior proposal and closed user feedback area into a revision request', async () => {
    const previous: ImportV2InterpretationProposal = {
      proposalId: 'proposal-old',
      plan,
      preview: [],
      unresolvedSourceRowNumbers: [],
    };
    const client = fakeClient(resolved());
    await inferImportV2PlanWithHarnex(document, {
      client,
      today: '2026-09-30',
      proposalIdFactory: () => 'proposal-new',
      feedback: {
        area: 'amount',
        previousProposal: { proposalId: previous.proposalId, plan: previous.plan },
      },
    });

    const input = JSON.parse(vi.mocked(client.generate).mock.calls[0]![0].input) as {
      userFeedback?: unknown;
    };
    expect(input.userFeedback).toEqual({
      area: 'amount',
      previousProposal: { proposalId: 'proposal-old', plan },
    });
  });

  it('does not call Harnex when there is no usable visible source window', async () => {
    const client = fakeClient(resolved());
    const empty: ImportV2RawDocument = {
      contractVersion: 1,
      sourceKind: 'csv',
      sheets: [{
        id: 'sheet-1', name: 'CSV', state: 'visible', rows: [{ rowNumber: 1, cells: ['only row'] }],
        totalNonEmptyRows: 1, samplesTruncated: false,
      }],
    };
    await expect(inferImportV2PlanWithHarnex(empty, { client })).resolves.toEqual({ status: 'unsupported' });
    expect(client.connect).not.toHaveBeenCalled();
  });
});
