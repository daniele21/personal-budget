import { describe, expect, it } from 'vitest';
import type { ImportV2RawDocument, ImportV2TransformationPlan } from '../interpretation';
import {
  createImportV2InterpretationPreview,
  splitImportV2DelimitedRecord,
} from '../interpretationExecutor';

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
      { rowNumber: 4, cells: ['14/09/2026;RISTORANTE;31,50;'] },
    ],
    totalNonEmptyRows: 4,
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
  description: { columnIndexes: [1], joinWith: ' ' },
  amount: {
    strategy: 'debit-credit',
    debitColumnIndex: 2,
    creditColumnIndex: 3,
  },
};

describe('Import V2 interpretation executor', () => {
  it('builds the expected provenance-bearing preview for the quoted-row CSV shape', () => {
    const result = createImportV2InterpretationPreview(document, plan, '2026-09-30');

    expect(result.unresolvedSourceRowNumbers).toEqual([]);
    expect(result.preview).toEqual([
      expect.objectContaining({
        date: '2026-09-12',
        description: 'SUPERMERCATO',
        signedAmountMinor: -4320,
        type: 'expense',
        provenance: expect.objectContaining({ sourceRowNumber: 2 }),
      }),
      expect.objectContaining({
        date: '2026-09-13',
        description: 'STIPENDIO',
        signedAmountMinor: 210000,
        type: 'income',
        provenance: expect.objectContaining({ sourceRowNumber: 3 }),
      }),
      expect.objectContaining({
        date: '2026-09-14',
        description: 'RISTORANTE',
        signedAmountMinor: -3150,
        type: 'expense',
        provenance: expect.objectContaining({ sourceRowNumber: 4 }),
      }),
    ]);
  });

  it('marks a row unresolved instead of silently dropping a malformed logical record', () => {
    const broken: ImportV2RawDocument = {
      ...document,
      sheets: [{
        ...document.sheets[0]!,
        rows: [
          ...document.sheets[0]!.rows.slice(0, 2),
          { rowNumber: 3, cells: ['"13/09/2026;BROKEN;;2100,00'] },
        ],
        totalNonEmptyRows: 3,
      }],
    };

    const result = createImportV2InterpretationPreview(broken, plan, '2026-09-30');
    expect(result.unresolvedSourceRowNumbers).toContain(3);
    expect(result.preview.map(({ provenance }) => provenance.sourceRowNumber)).not.toContain(3);
  });

  it('parses escaped quotes without enabling arbitrary parser logic', () => {
    expect(splitImportV2DelimitedRecord('2026-09-12;"SHOP ""CENTRO""";-10.00', ';')).toEqual([
      '2026-09-12',
      'SHOP "CENTRO"',
      '-10.00',
    ]);
    expect(splitImportV2DelimitedRecord('2026-09-12;"unterminated;-10.00', ';')).toBeNull();
  });
});
