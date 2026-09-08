import { describe, expect, it, vi } from 'vitest';
import { createDescriptionMatchKey } from '../../../../domain/import/descriptionMatching';
import type {
  PreparedImportRow,
  PreparedTransactionImport,
} from '../../../../domain/import/structuredImportTypes';
import type {
  HarnexClient,
  HarnexGenerationResult,
} from '../../../../platform/harnex';
import type { Transaction } from '../../../../types';
import { resolveImportV2Categories } from '../categoryEngine';

function row(
  rowId: string,
  description: string,
  type: 'expense' | 'income' = 'expense',
): PreparedImportRow {
  return {
    rowId,
    sourceRowNumber: Number(rowId.replace(/\D/g, '')) || 1,
    date: '2026-09-01',
    description,
    signedAmountMinor: type === 'expense' ? -450 : 450,
    type,
    category: 'Uncategorized',
    categorySource: 'uncategorized',
    included: true,
    selectedForBatch: false,
    descriptionMatchKey: createDescriptionMatchKey(description, type),
    duplicateMatches: [],
    issues: [],
  };
}

function prepared(rows: PreparedImportRow[]): PreparedTransactionImport {
  return {
    sourceKind: 'structured-csv',
    preparedAt: '2026-09-08T12:00:00.000Z',
    baseLedgerFingerprint: 'ledger-fingerprint',
    rows,
    issues: [],
    summary: {
      totalRows: rows.length,
      includedRows: rows.length,
      excludedRows: 0,
      incomeMinor: 0,
      expenseMinor: 0,
      netMinor: 0,
      uncategorizedRows: rows.length,
      warningRows: 0,
      possibleDuplicateRows: 0,
    },
    undoStack: [],
  };
}

function transaction(
  id: string,
  description: string,
  category: string,
  type: 'expense' | 'income' = 'expense',
): Transaction {
  return {
    id,
    amount: 4.5,
    type,
    category,
    date: '2026-08-01',
    title: description,
    description,
    paymentMethod: 'Card',
  };
}

function completed(items: Array<{ id: string; categoryId: string | null }>): HarnexGenerationResult {
  return {
    status: 'completed',
    answer: JSON.stringify({ items }),
    metrics: { totalMs: 5 },
  };
}

function fakeClient() {
  const connect = vi.fn<HarnexClient['connect']>(async () => ({ status: 'connected' }));
  const probe = vi.fn<HarnexClient['probe']>(async () => ({
    status: 'available',
    maxInputCharacters: 12_000,
    maxJsonSchemaCharacters: 4_096,
  }));
  const generate = vi.fn<HarnexClient['generate']>(async (request) => {
    const input = JSON.parse(request.input) as { items: Array<{ id: string }> };
    return completed(input.items.map((item) => ({ id: item.id, categoryId: 'category-1' })));
  });
  const cancel = vi.fn<HarnexClient['cancel']>(async () => ({ cancelled: true }));
  const disconnect = vi.fn<HarnexClient['disconnect']>(async () => ({ status: 'disconnected' }));
  return { connect, probe, generate, cancel, disconnect } satisfies HarnexClient;
}

describe('resolveImportV2Categories', () => {
  it('resolves unambiguous active local history before any Harnex call', async () => {
    const client = fakeClient();
    const input = prepared([
      row('row-1', '  AURA   Market '),
      row('row-2', 'aura market'),
    ]);
    const ledger = [transaction('tx-1', 'Aura Market', 'Groceries')];

    await expect(resolveImportV2Categories(input, ledger, ['Groceries', 'Travel'], { client })).resolves.toEqual({
      suggestions: [{
        groupId: 'group-1',
        rowIds: ['row-1', 'row-2'],
        category: 'Groceries',
        source: 'local-history',
      }],
      unresolvedRowIds: [],
      harnex: { status: 'not-needed', completedBatches: 0, totalBatches: 0 },
    });
    expect(client.connect).not.toHaveBeenCalled();
    expect(client.generate).not.toHaveBeenCalled();
  });

  it('keeps conflicting history unresolved and sends only group description/type plus ephemeral categories', async () => {
    const client = fakeClient();
    const input = prepared([row('row-1', 'Coffee Shop')]);
    const ledger = [
      transaction('tx-1', 'coffee shop', 'Dining'),
      transaction('tx-2', 'Coffee   Shop', 'Leisure'),
    ];

    const result = await resolveImportV2Categories(input, ledger, ['Dining', 'Leisure'], { client });

    expect(result.suggestions).toEqual([{
      groupId: 'group-1',
      rowIds: ['row-1'],
      category: 'Dining',
      source: 'harnex',
    }]);
    const request = client.generate.mock.calls[0]![0];
    expect(request.input).toContain('coffee shop');
    expect(request.input).toContain('category-1');
    expect(request.input).not.toContain('2026-09-01');
    expect(request.input).not.toContain('-450');
    expect(request.input).not.toContain('tx-1');
  });

  it('deduplicates same-description groups while keeping transaction type distinct', async () => {
    const client = fakeClient();
    const input = prepared([
      row('row-1', 'Salary', 'income'),
      row('row-2', ' salary ', 'income'),
      row('row-3', 'Salary', 'expense'),
    ]);

    await resolveImportV2Categories(input, [], ['Income', 'Other'], { client });

    const request = client.generate.mock.calls[0]![0];
    const payload = JSON.parse(request.input) as { items: Array<{ id: string; type: string }> };
    expect(payload.items).toHaveLength(2);
    expect(payload.items.map((item) => item.type).sort()).toEqual(['expense', 'income']);
  });

  it('packs by advertised character budget and runs generation sequentially', async () => {
    const client = fakeClient();
    client.probe.mockResolvedValue({
      status: 'available',
      maxInputCharacters: 1_900,
      maxJsonSchemaCharacters: 4_096,
    });
    let active = 0;
    let maxActive = 0;
    client.generate.mockImplementation(async (request) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      const payload = JSON.parse(request.input) as { items: Array<{ id: string }> };
      return completed(payload.items.map((item) => ({ id: item.id, categoryId: 'category-1' })));
    });
    const input = prepared([
      row('row-1', `Merchant A ${'x'.repeat(700)}`),
      row('row-2', `Merchant B ${'y'.repeat(700)}`),
    ]);

    const result = await resolveImportV2Categories(input, [], ['Other'], { client });

    expect(client.generate).toHaveBeenCalledTimes(2);
    expect(maxActive).toBe(1);
    expect(result.harnex).toEqual({ status: 'completed', completedBatches: 2, totalBatches: 2 });
  });

  it('fails a malformed batch closed when Harnex returns an unknown category ID', async () => {
    const client = fakeClient();
    client.generate.mockResolvedValue(completed([{ id: 'group-1', categoryId: 'category-unknown' }]));

    const result = await resolveImportV2Categories(
      prepared([row('row-1', 'Unknown merchant')]),
      [],
      ['Known'],
      { client },
    );

    expect(result.suggestions).toEqual([]);
    expect(result.unresolvedRowIds).toEqual(['row-1']);
    expect(result.harnex).toMatchObject({
      status: 'partial-failure',
      completedBatches: 0,
      failure: { code: 'INVALID_REQUEST' },
    });
  });

  it('preserves successful earlier batches when a later batch fails', async () => {
    const client = fakeClient();
    client.probe.mockResolvedValue({
      status: 'available',
      maxInputCharacters: 1_900,
      maxJsonSchemaCharacters: 4_096,
    });
    client.generate
      .mockResolvedValueOnce(completed([{ id: 'group-1', categoryId: 'category-1' }]))
      .mockResolvedValueOnce({
        status: 'failed',
        failure: { code: 'CONNECTION_LOST', message: 'Connection lost.' },
      });
    const input = prepared([
      row('row-1', `Merchant A ${'x'.repeat(700)}`),
      row('row-2', `Merchant B ${'y'.repeat(700)}`),
    ]);

    const result = await resolveImportV2Categories(input, [], ['Other'], { client });

    expect(result.suggestions).toEqual([{
      groupId: 'group-1',
      rowIds: ['row-1'],
      category: 'Other',
      source: 'harnex',
    }]);
    expect(result.unresolvedRowIds).toEqual(['row-2']);
    expect(result.harnex).toMatchObject({
      status: 'partial-failure',
      completedBatches: 1,
      totalBatches: 2,
      failure: { code: 'CONNECTION_LOST' },
    });
  });

  it('keeps local suggestions when Harnex is unavailable', async () => {
    const client = fakeClient();
    client.probe.mockResolvedValue({
      status: 'unavailable',
      failure: { code: 'MODEL_UNAVAILABLE', message: 'Model unavailable.' },
    });
    const input = prepared([
      row('row-1', 'Known merchant'),
      row('row-2', 'New merchant'),
    ]);
    const ledger = [transaction('tx-1', 'Known merchant', 'Known')];

    const result = await resolveImportV2Categories(input, ledger, ['Known', 'Other'], { client });

    expect(result.suggestions).toEqual([{
      groupId: 'group-1',
      rowIds: ['row-1'],
      category: 'Known',
      source: 'local-history',
    }]);
    expect(result.unresolvedRowIds).toEqual(['row-2']);
    expect(result.harnex).toMatchObject({ status: 'unavailable', failure: { code: 'MODEL_UNAVAILABLE' } });
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it('cancels the active batch and disconnects without losing local results', async () => {
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

    const task = resolveImportV2Categories(
      prepared([row('row-1', 'New merchant')]),
      [],
      ['Other'],
      { client, signal: controller.signal },
    );
    await vi.waitFor(() => expect(client.generate).toHaveBeenCalledOnce());
    controller.abort();

    const result = await task;
    expect(result.unresolvedRowIds).toEqual(['row-1']);
    expect(result.harnex).toMatchObject({ status: 'cancelled', failure: { code: 'CANCELLED' } });
    expect(client.cancel).toHaveBeenCalledOnce();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });
});
