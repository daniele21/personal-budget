import { describe, expect, it } from 'vitest';
import { executeImportV2Mapping } from '../../../services/import/executeImportV2Mapping';
import { readSpreadsheetProfile } from '../spreadsheetProfileReader';

function quotedRowFile(): File {
  return new File([
    '"Data Operazione;Causale;Uscite;Entrate"\n',
    '"12/09/2026;SUPERMERCATO;43,20;"\n',
    '"13/09/2026;STIPENDIO;;2100,00"\n',
    '"14/09/2026;RISTORANTE;31,50;"\n',
  ], 'quoted-bank.csv', { type: 'text/csv' });
}

describe('delimited-cell manual mapping fallback', () => {
  it('profiles logical fields and deterministically executes the user-selected mapping', async () => {
    const file = quotedRowFile();
    const profiled = await readSpreadsheetProfile(file);
    expect(profiled.kind).toBe('profiled');
    if (profiled.kind !== 'profiled') return;

    const sheet = profiled.profile.sheets[0]!;
    expect(sheet.id).toBe('sheet-1:delimited-cell:semicolon');
    const header = sheet.headerCandidates.find(({ rowNumber }) => rowNumber === 1)!;
    expect(header.columns.map(({ header: label }) => label)).toEqual([
      'Data Operazione',
      'Causale',
      'Uscite',
      'Entrate',
    ]);

    const dateCandidate = header.dateCandidates.find(({ columnId }) =>
      header.columns.find(({ id }) => id === columnId)?.header === 'Data Operazione'
    )!;
    const amountCandidate = header.amountCandidates.find(({ strategy }) => strategy === 'debit-credit')!;
    const descriptionColumnId = header.descriptionCandidateColumnIds.find((columnId) =>
      header.columns.find(({ id }) => id === columnId)?.header === 'Causale'
    )!;

    const validation = await executeImportV2Mapping(file, profiled.profile, {
      dateCandidateId: dateCandidate.id,
      amountCandidateId: amountCandidate.id,
      descriptionColumnIds: [descriptionColumnId],
    }, { today: '2026-09-30' });

    expect(validation.hasBlockingIssues).toBe(false);
    expect(validation.rows).toEqual([
      expect.objectContaining({
        sourceRowNumber: 2,
        date: '2026-09-12',
        description: 'SUPERMERCATO',
        signedAmountMinor: -4320,
      }),
      expect.objectContaining({
        sourceRowNumber: 3,
        date: '2026-09-13',
        description: 'STIPENDIO',
        signedAmountMinor: 210000,
      }),
      expect.objectContaining({
        sourceRowNumber: 4,
        date: '2026-09-14',
        description: 'RISTORANTE',
        signedAmountMinor: -3150,
      }),
    ]);
  });

  it('keeps the profile source-shaped when no single repeated delimiter explains every row', async () => {
    const file = new File([
      '"Header A;Header B"\n',
      '"left|right"\n',
      '"again;value"\n',
    ], 'ambiguous-shape.csv', { type: 'text/csv' });

    const profiled = await readSpreadsheetProfile(file);
    expect(profiled.kind).toBe('profiled');
    if (profiled.kind !== 'profiled') return;
    expect(profiled.profile.sheets[0]?.id).toBe('sheet-1');
  });
});
