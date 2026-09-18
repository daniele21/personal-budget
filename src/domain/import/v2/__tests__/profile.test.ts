import { describe, expect, it } from 'vitest';
import {
  profileSpreadsheet,
  type ProfileWorkbookInput,
} from '../profile';

function csvInput(rows: ProfileWorkbookInput['sheets'][number]['rows']): ProfileWorkbookInput {
  return {
    sourceKind: 'csv',
    csvDelimiter: ',',
    sheets: [{
      id: 'sheet-1',
      name: 'CSV',
      state: 'visible',
      rows,
      totalNonEmptyRows: rows.length,
      samplesTruncated: false,
    }],
  };
}

describe('Import V2 spreadsheet profiler', () => {
  it('finds a header after bounded metadata rows', () => {
    const profile = profileSpreadsheet(csvInput([
      { rowNumber: 1, cells: ['Synthetic export'] },
      { rowNumber: 2, cells: ['September 2026'] },
      { rowNumber: 3, cells: ['Generated for tests'] },
      { rowNumber: 4, cells: ['Date', 'Memo', 'Amount'] },
      { rowNumber: 5, cells: ['2026-09-01', 'Synthetic Grocery', '-31.20'] },
      { rowNumber: 6, cells: ['2026-09-02', 'Synthetic Salary', '1900.00'] },
    ]));

    expect(profile.sheets[0]?.headerCandidates[0]?.rowNumber).toBe(4);
  });

  it('emits only Aura-owned date and amount strategies', () => {
    const profile = profileSpreadsheet(csvInput([
      { rowNumber: 1, cells: ['Data', 'Causale', 'Dare', 'Avere'] },
      { rowNumber: 2, cells: ['01/09/2026', 'Synthetic Grocery', '42,70', ''] },
      { rowNumber: 3, cells: ['02/09/2026', 'Synthetic Salary', '', '2500,00'] },
      { rowNumber: 4, cells: ['03/09/2026', 'Synthetic Streaming', '12,99', ''] },
    ]));
    const header = profile.sheets[0]?.headerCandidates[0];

    expect(header?.dateCandidates.map(({ parser }) => parser)).toContain('dmy-slash');
    expect(header?.amountCandidates.map(({ strategy }) => strategy)).toEqual(['debit-credit']);
  });

  it('keeps multiple plausible numeric candidates instead of guessing Amount over Balance', () => {
    const profile = profileSpreadsheet(csvInput([
      { rowNumber: 1, cells: ['Date', 'Description', 'Amount', 'Balance'] },
      { rowNumber: 2, cells: ['2026-09-01', 'Synthetic Grocery', '-20.00', '980.00'] },
      { rowNumber: 3, cells: ['2026-09-02', 'Synthetic Salary', '2000.00', '2980.00'] },
      { rowNumber: 4, cells: ['2026-09-03', 'Synthetic Cafe', '-5.00', '2975.00'] },
    ]));
    const header = profile.sheets[0]?.headerCandidates[0];
    const signedColumns = header?.amountCandidates
      .filter(({ strategy }) => strategy === 'signed-negative-expense')
      .map((candidate) => {
        if (!('columnId' in candidate)) return '';
        return header.columns.find(({ id }) => id === candidate.columnId)?.header ?? '';
      });

    expect(signedColumns).toEqual(expect.arrayContaining(['Amount', 'Balance']));
  });

  it('keeps weakly typed arbitrary columns available for Harnex selection', () => {
    const profile = profileSpreadsheet(csvInput([
      { rowNumber: 1, cells: ['Recorded', 'Narrative', 'Value'] },
      { rowNumber: 2, cells: ['01.09.2026 10:30', 'Synthetic Cafe', 'EUR 12,40'] },
      { rowNumber: 3, cells: ['02.09.2026 08:00', 'Synthetic Salary', 'EUR 2400,00'] },
      { rowNumber: 4, cells: ['03.09.2026 18:10', 'Synthetic Transit', 'EUR 4,20'] },
    ]));
    const header = profile.sheets[0]?.headerCandidates[0];
    expect(header).toBeDefined();

    const candidateColumnLabels = (ids: readonly string[]) => ids.map((id) =>
      header?.columns.find((column) => column.id === id)?.header,
    );
    const amountColumnLabels = header?.amountCandidates.flatMap((candidate) => {
      if ('columnId' in candidate) return candidateColumnLabels([candidate.columnId]);
      if ('debitColumnId' in candidate) {
        return candidateColumnLabels([candidate.debitColumnId, candidate.creditColumnId]);
      }
      return candidateColumnLabels([candidate.amountColumnId, candidate.directionColumnId]);
    });

    expect(header?.dateCandidates.length).toBeGreaterThan(0);
    expect(amountColumnLabels).toContain('Value');
    expect(candidateColumnLabels(header?.descriptionCandidateColumnIds ?? [])).toContain('Narrative');
  });

  it('preserves strongly evidenced candidates beyond the speculative fallback cap', () => {
    const headings = [
      'Meta 1', 'Meta 2', 'Meta 3', 'Meta 4', 'Meta 5',
      'Meta 6', 'Meta 7', 'Meta 8', 'Posted Date', 'Amount',
    ];
    const dataRow = (date: string, amount: string) => [
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', date, amount,
    ];
    const profile = profileSpreadsheet(csvInput([
      { rowNumber: 1, cells: headings },
      { rowNumber: 2, cells: dataRow('2026-09-01', '-12.40') },
      { rowNumber: 3, cells: dataRow('2026-09-02', '2400.00') },
      { rowNumber: 4, cells: dataRow('2026-09-03', '-4.20') },
    ]));
    const header = profile.sheets[0]?.headerCandidates[0];
    expect(header).toBeDefined();

    const dateLabels = header?.dateCandidates.map((candidate) =>
      header.columns.find((column) => column.id === candidate.columnId)?.header,
    );
    const signedAmountLabels = header?.amountCandidates
      .filter((candidate) => candidate.strategy === 'signed-negative-expense')
      .map((candidate) => {
        if (!('columnId' in candidate)) return '';
        return header.columns.find((column) => column.id === candidate.columnId)?.header ?? '';
      });

    expect(dateLabels).toContain('Posted Date');
    expect(signedAmountLabels).toContain('Amount');
  });

  it('makes formula and merged columns ineligible for executable candidates', () => {
    const profile = profileSpreadsheet(csvInput([
      { rowNumber: 1, cells: ['Date', 'Description', 'Amount'] },
      {
        rowNumber: 2,
        cells: ['2026-09-01', 'Synthetic Grocery', { kind: 'formula' }],
        mergedColumnIndexes: [1],
      },
      { rowNumber: 3, cells: ['2026-09-02', 'Synthetic Salary', '2000.00'] },
    ]));
    const header = profile.sheets[0]?.headerCandidates[0];
    const amountColumn = header?.columns.find(({ header: label }) => label === 'Amount');
    const descriptionColumn = header?.columns.find(({ header: label }) => label === 'Description');

    expect(amountColumn?.formulaCount).toBe(1);
    expect(header?.amountCandidates.some((candidate) => (
      'columnId' in candidate && candidate.columnId === amountColumn?.id
    ))).toBe(false);
    expect(descriptionColumn?.mergedCellCount).toBe(1);
    expect(header?.descriptionCandidateColumnIds).not.toContain(descriptionColumn?.id);
  });
});
