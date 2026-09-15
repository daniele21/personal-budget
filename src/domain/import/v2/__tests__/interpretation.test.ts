import { describe, expect, it } from 'vitest';
import {
  confirmImportV2Interpretation,
  validateImportV2TransformationPlan,
  type ImportV2InterpretationProposal,
  type ImportV2RawDocument,
  type ImportV2TransformationPlan,
} from '../interpretation';

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
    stripOuterQuotes: true,
    headerRowNumber: 1,
    firstDataRowNumber: 2,
  },
  date: { columnIndex: 0, parser: 'dmy-slash' },
  description: { columnIndexes: [1] },
  amount: {
    strategy: 'debit-credit',
    debitColumnIndex: 2,
    creditColumnIndex: 3,
  },
};

describe('Import V2 interactive interpretation contract', () => {
  it('accepts a bounded declarative plan for a quoted-row CSV shape', () => {
    expect(validateImportV2TransformationPlan(document, plan)).toEqual([]);
  });

  it('rejects unknown sheets and invalid/duplicate indexes before execution', () => {
    expect(validateImportV2TransformationPlan(document, {
      ...plan,
      sheetId: 'missing',
    })).toEqual([{ code: 'unknown-sheet' }]);

    const issues = validateImportV2TransformationPlan(document, {
      ...plan,
      description: { columnIndexes: [1, 1] },
      amount: {
        strategy: 'debit-credit',
        debitColumnIndex: 2,
        creditColumnIndex: 2,
      },
    });

    expect(issues).toContainEqual({ code: 'duplicate-description-column' });
    expect(issues).toContainEqual({ code: 'invalid-amount-columns' });
  });

  it('creates an explicit confirmed boundary without changing the proposal', () => {
    const proposal: ImportV2InterpretationProposal = {
      proposalId: 'proposal-1',
      plan,
      preview: [{
        date: '2026-09-12',
        description: 'SUPERMERCATO',
        signedAmountMinor: -4320,
        type: 'expense',
        provenance: {
          sourceRowNumber: 2,
          dateColumnIndex: 0,
          descriptionColumnIndexes: [1],
          amountColumnIndexes: [2, 3],
        },
      }],
      unresolvedSourceRowNumbers: [],
    };

    expect(confirmImportV2Interpretation(proposal)).toEqual({
      status: 'confirmed',
      proposalId: 'proposal-1',
      plan,
    });
    expect(proposal.preview).toHaveLength(1);
  });
});
