import { describe, expect, it } from 'vitest';
import {
  confirmImportV2Interpretation,
  type ImportV2InterpretationProposal,
  type ImportV2TransformationPlan,
} from '../../../../domain/import/v2';
import { executeConfirmedImportV2Interpretation } from '../confirmedPlanExecution';

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

describe('executeConfirmedImportV2Interpretation', () => {
  it('executes the quoted-row source only through the explicit confirmed boundary', async () => {
    const file = new File([
      '"Data Operazione;Causale;Uscite;Entrate"\n',
      '"12/09/2026;SUPERMERCATO;43,20;"\n',
      '"13/09/2026;STIPENDIO;;2100,00"\n',
      '"14/09/2026;RISTORANTE;31,50;"\n',
    ], 'synthetic.csv');

    const outcome = await executeConfirmedImportV2Interpretation(
      file,
      confirmImportV2Interpretation(proposal()),
      '2026-09-30',
    );

    expect(outcome.status).toBe('resolved');
    if (outcome.status !== 'resolved') return;
    expect(outcome.validation.rows).toEqual([
      expect.objectContaining({ sourceRowNumber: 2, date: '2026-09-12', signedAmountMinor: -4320 }),
      expect.objectContaining({ sourceRowNumber: 3, date: '2026-09-13', signedAmountMinor: 210000 }),
      expect.objectContaining({ sourceRowNumber: 4, date: '2026-09-14', signedAmountMinor: -3150 }),
    ]);
  });

  it('returns unresolved source rows instead of silently dropping malformed data', async () => {
    const file = new File([
      '"Data Operazione;Causale;Uscite;Entrate"\n',
      '"12/09/2026;SUPERMERCATO;43,20;"\n',
      '"not-a-date;BROKEN;31,50;"\n',
    ], 'synthetic.csv');

    const outcome = await executeConfirmedImportV2Interpretation(
      file,
      confirmImportV2Interpretation(proposal()),
      '2026-09-30',
    );

    expect(outcome.status).toBe('unresolved');
    if (outcome.status !== 'unresolved') return;
    expect(outcome.sourceRowNumbers).toContain(3);
  });

  it('fails closed if a forged runtime value does not carry confirmed status', async () => {
    const file = new File(['Date;Text;Debit;Credit\n'], 'synthetic.csv');
    const outcome = await executeConfirmedImportV2Interpretation(
      file,
      { status: 'confirmed', proposalId: '', plan } as ReturnType<typeof confirmImportV2Interpretation>,
    );
    expect(outcome).toEqual({ status: 'rejected', reason: 'invalid-confirmation' });
  });
});
