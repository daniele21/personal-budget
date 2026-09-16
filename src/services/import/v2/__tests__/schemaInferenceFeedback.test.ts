import { describe, expect, it, vi } from 'vitest';
import type { SpreadsheetProfile } from '../../../../domain/import/v2';
import type { HarnexClient } from '../../../../platform/harnex';
import { inferImportV2SchemaWithHarnex } from '../schemaInference';

function profile(): SpreadsheetProfile {
  return {
    sourceKind: 'csv',
    csvDelimiter: ';',
    sheets: [{
      id: 'sheet-1',
      name: 'Transactions',
      state: 'visible',
      totalNonEmptyRows: 4,
      samplesTruncated: false,
      headerCandidates: [{
        id: 'header-1',
        rowNumber: 1,
        score: 1,
        columns: [
          {
            id: 'date-col',
            columnIndex: 0,
            header: 'Date',
            nonEmptyCount: 3,
            nonEmptyRatio: 1,
            textRatio: 1,
            numericRatio: 0,
            dateLikeRatio: 1,
            positiveNumericRatio: 0,
            negativeNumericRatio: 0,
            formulaCount: 0,
            mergedCellCount: 0,
            directionRatio: 0,
            dateParsers: ['iso-date'],
            samples: ['2026-09-01'],
          },
          {
            id: 'description-col',
            columnIndex: 1,
            header: 'Description',
            nonEmptyCount: 3,
            nonEmptyRatio: 1,
            textRatio: 1,
            numericRatio: 0,
            dateLikeRatio: 0,
            positiveNumericRatio: 0,
            negativeNumericRatio: 0,
            formulaCount: 0,
            mergedCellCount: 0,
            directionRatio: 0,
            dateParsers: [],
            samples: ['Synthetic market'],
          },
          {
            id: 'amount-col',
            columnIndex: 2,
            header: 'Amount',
            nonEmptyCount: 3,
            nonEmptyRatio: 1,
            textRatio: 0,
            numericRatio: 1,
            dateLikeRatio: 0,
            positiveNumericRatio: 0,
            negativeNumericRatio: 1,
            formulaCount: 0,
            mergedCellCount: 0,
            directionRatio: 0,
            dateParsers: [],
            samples: ['-4.50'],
          },
        ],
        dateCandidates: [{ id: 'date-1', columnId: 'date-col', parser: 'iso-date' }],
        amountCandidates: [{
          id: 'amount-1',
          strategy: 'signed-negative-expense',
          columnId: 'amount-col',
        }],
        descriptionCandidateColumnIds: ['description-col'],
      }],
    }],
  };
}

function client(): HarnexClient {
  return {
    connect: vi.fn<HarnexClient['connect']>(async () => ({ status: 'connected' })),
    probe: vi.fn<HarnexClient['probe']>(async () => ({
      status: 'available',
      maxInputCharacters: 20_000,
      maxJsonSchemaCharacters: 8_000,
    })),
    generate: vi.fn<HarnexClient['generate']>(async () => ({
      status: 'completed',
      answer: JSON.stringify({
        status: 'resolved',
        sheetId: 'sheet-1',
        headerCandidateId: 'header-1',
        dateCandidateId: 'date-1',
        descriptionColumnIds: ['description-col'],
        amountCandidateId: 'amount-1',
      }),
      metrics: { totalMs: 4 },
    })),
    cancel: vi.fn<HarnexClient['cancel']>(async () => ({ cancelled: true })),
    disconnect: vi.fn<HarnexClient['disconnect']>(async () => ({ status: 'disconnected' })),
  };
}

describe('schema inference feedback', () => {
  it('sends a closed feedback area and previous selection for revision', async () => {
    const harnex = client();
    await inferImportV2SchemaWithHarnex(profile(), {
      client: harnex,
      feedback: {
        area: 'amount',
        previousSelection: {
          sheetId: 'sheet-1',
          headerCandidateId: 'header-1',
          dateCandidateId: 'date-1',
          descriptionColumnIds: ['description-col'],
          amountCandidateId: 'amount-1',
        },
      },
    });

    const generate = vi.mocked(harnex.generate);
    const input = JSON.parse(generate.mock.calls[0]![0].input) as Record<string, unknown>;
    expect(input.userFeedback).toEqual({
      area: 'amount',
      previousSelection: {
        sheetId: 'sheet-1',
        headerCandidateId: 'header-1',
        dateCandidateId: 'date-1',
        descriptionColumnIds: ['description-col'],
        amountCandidateId: 'amount-1',
      },
    });
  });

  it('does not add a feedback object when the user has not rejected a proposal', async () => {
    const harnex = client();
    await inferImportV2SchemaWithHarnex(profile(), { client: harnex });

    const generate = vi.mocked(harnex.generate);
    const input = JSON.parse(generate.mock.calls[0]![0].input) as Record<string, unknown>;
    expect(input).not.toHaveProperty('userFeedback');
  });
});
