import { describe, expect, it, vi } from 'vitest';
import {
  confirmImportV2Interpretation,
  type ImportV2InterpretationProposal,
  type ImportV2TransformationPlan,
} from '../../../../domain/import/v2';
import type { HarnexClient } from '../../../../platform/harnex';
import { executeConfirmedImportV2Interpretation } from '../confirmedPlanExecution';
import {
  IMPORT_V2_ROW_REPAIR_MAX_ROWS,
  repairUnresolvedImportV2RowsWithHarnex,
} from '../rowExceptionRepair';

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

function proposal(): ImportV2InterpretationProposal {
  return {
    proposalId: 'proposal-1',
    plan,
    preview: [],
    unresolvedSourceRowNumbers: [],
  };
}

function fileWithOneDateException(): File {
  return new File([
    '"Data Operazione;Causale;Uscite;Entrate"\n',
    '"12/09/2026;SUPERMERCATO;43,20;"\n',
    '"14-09-2026;RISTORANTE;31,50;"\n',
  ], 'synthetic.csv');
}

function repairAnswer(status: 'repair' | 'unresolved' | 'global-plan-wrong' = 'repair'): string {
  if (status !== 'repair') return JSON.stringify({ status });
  return JSON.stringify({
    status: 'repair',
    sourceRowNumber: 3,
    repair: {
      date: { columnIndex: 0, parser: 'dmy-dash' },
      description: { columnIndexes: [1] },
      amount: { strategy: 'debit-credit', debitColumnIndex: 2, creditColumnIndex: 3 },
    },
  });
}

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

async function unresolvedExecution(file: File) {
  const confirmed = confirmImportV2Interpretation(proposal());
  const execution = await executeConfirmedImportV2Interpretation(file, confirmed, '2026-09-30');
  expect(execution.status).toBe('unresolved');
  if (execution.status !== 'unresolved') throw new Error('expected unresolved execution');
  return { confirmed, execution };
}

describe('repairUnresolvedImportV2RowsWithHarnex', () => {
  it('repairs only the unresolved row through declarative source references and Aura deterministic execution', async () => {
    const file = fileWithOneDateException();
    const { confirmed, execution } = await unresolvedExecution(file);
    const client = fakeClient(repairAnswer());

    const outcome = await repairUnresolvedImportV2RowsWithHarnex(file, confirmed, execution, {
      client,
      today: '2026-09-30',
    });

    expect(outcome.status).toBe('resolved');
    if (outcome.status !== 'resolved') return;
    expect(outcome.repairedSourceRowNumbers).toEqual([3]);
    expect(outcome.validation.rows).toEqual([
      expect.objectContaining({ sourceRowNumber: 2, date: '2026-09-12', signedAmountMinor: -4320 }),
      expect.objectContaining({
        sourceRowNumber: 3,
        date: '2026-09-14',
        description: 'RISTORANTE',
        signedAmountMinor: -3150,
      }),
    ]);

    const request = vi.mocked(client.generate).mock.calls[0]![0];
    expect(request.useCaseId).toBe('aura-transaction-schema-inference');
    expect(request.input).toContain('RISTORANTE');
    expect(request.input).not.toContain('SUPERMERCATO');
    expect(request.jsonSchema).not.toContain('signedAmountMinor');
    expect(request.jsonSchema).not.toContain('descriptionValue');
    expect(request.jsonSchema).not.toContain('dateValue');
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('fails closed when Harnex tries to smuggle a financial value into the repair response', async () => {
    const file = fileWithOneDateException();
    const { confirmed, execution } = await unresolvedExecution(file);
    const unsafe = JSON.stringify({
      status: 'repair',
      sourceRowNumber: 3,
      repair: {
        date: { columnIndex: 0, parser: 'dmy-dash' },
        description: { columnIndexes: [1] },
        amount: { strategy: 'debit-credit', debitColumnIndex: 2, creditColumnIndex: 3 },
        signedAmountMinor: -1,
      },
    });

    const outcome = await repairUnresolvedImportV2RowsWithHarnex(
      file,
      confirmed,
      execution,
      { client: fakeClient(unsafe), today: '2026-09-30' },
    );

    expect(outcome.status).toBe('unresolved');
    if (outcome.status === 'unresolved') {
      expect(outcome.sourceRowNumbers).toEqual([3]);
      expect(outcome.repairedSourceRowNumbers).toEqual([]);
    }
  });

  it('returns to global interpretation when Harnex says the confirmed structure itself is wrong', async () => {
    const file = fileWithOneDateException();
    const { confirmed, execution } = await unresolvedExecution(file);
    const outcome = await repairUnresolvedImportV2RowsWithHarnex(
      file,
      confirmed,
      execution,
      { client: fakeClient(repairAnswer('global-plan-wrong')), today: '2026-09-30' },
    );

    expect(outcome.status).toBe('global-plan-wrong');
    if (outcome.status === 'global-plan-wrong') {
      expect(outcome.sourceRowNumbers).toEqual([3]);
    }
  });

  it('cancels the active Harnex repair and still disconnects before returning', async () => {
    const file = fileWithOneDateException();
    const { confirmed, execution } = await unresolvedExecution(file);
    const controller = new AbortController();
    const client = fakeClient(repairAnswer());
    vi.mocked(client.generate).mockImplementation(async () => {
      controller.abort();
      return {
        status: 'failed',
        failure: { code: 'CANCELLED', message: 'Cancelled.' },
      };
    });

    const outcome = await repairUnresolvedImportV2RowsWithHarnex(file, confirmed, execution, {
      client,
      signal: controller.signal,
      today: '2026-09-30',
    });

    expect(outcome.status).toBe('assistance-unavailable');
    if (outcome.status !== 'assistance-unavailable') return;
    expect(outcome.failure.code).toBe('CANCELLED');
    expect(outcome.sourceRowNumbers).toEqual([3]);
    expect(outcome.repairedSourceRowNumbers).toEqual([]);
    expect(client.cancel).toHaveBeenCalledOnce();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('fails closed when cleanup fails after a row was deterministically repaired', async () => {
    const file = fileWithOneDateException();
    const { confirmed, execution } = await unresolvedExecution(file);
    const client = fakeClient(repairAnswer());
    vi.mocked(client.disconnect).mockResolvedValue({
      status: 'failed',
      failure: { code: 'RUNTIME_FAILURE', message: 'Cleanup failed.' },
    });

    const outcome = await repairUnresolvedImportV2RowsWithHarnex(file, confirmed, execution, {
      client,
      today: '2026-09-30',
    });

    expect(outcome.status).toBe('assistance-unavailable');
    if (outcome.status !== 'assistance-unavailable') return;
    expect(outcome.failure.code).toBe('RUNTIME_FAILURE');
    expect(outcome.repairedSourceRowNumbers).toEqual([3]);
    expect(outcome.sourceRowNumbers).toEqual([3]);
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('does not invoke Harnex when the unresolved set exceeds the bounded repair budget', async () => {
    const client = fakeClient(repairAnswer());
    const sourceRowNumbers = Array.from(
      { length: IMPORT_V2_ROW_REPAIR_MAX_ROWS + 1 },
      (_, index) => index + 2,
    );
    const execution = {
      status: 'unresolved' as const,
      validation: {
        sourceKind: 'structured-csv' as const,
        rows: [],
        issues: [],
        hasBlockingIssues: true,
      },
      sourceRowNumbers,
    };

    const outcome = await repairUnresolvedImportV2RowsWithHarnex(
      fileWithOneDateException(),
      confirmImportV2Interpretation(proposal()),
      execution,
      { client },
    );

    expect(outcome.status).toBe('unresolved');
    expect(client.connect).not.toHaveBeenCalled();
  });
});
