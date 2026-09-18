import { describe, expect, it } from 'vitest';
import { inferDeterministicImportV2Mapping } from '../deterministicMapping';
import { resolveImportV2Mapping } from '../mapping';
import { profileSpreadsheet } from '../profile';

function resolvedMapping(profile: ReturnType<typeof profileSpreadsheet>) {
  const outcome = inferDeterministicImportV2Mapping(profile);
  expect(outcome.status).toBe('resolved');
  if (outcome.status !== 'resolved') throw new Error('Expected resolved mapping.');
  return resolveImportV2Mapping(profile, outcome.selection);
}

describe('inferDeterministicImportV2Mapping', () => {
  it('resolves localized date/description plus explicit outflow/inflow without Harnex', () => {
    const profile = profileSpreadsheet({
      sourceKind: 'csv',
      csvDelimiter: ';',
      sheets: [{
        id: 'sheet-1',
        name: 'CSV',
        state: 'visible',
        rows: [
          { rowNumber: 1, cells: ['Data Operazione', 'Causale', 'Uscite', 'Entrate'] },
          { rowNumber: 2, cells: ['12/09/2026', 'SUPERMERCATO', '43,20', ''] },
          { rowNumber: 3, cells: ['13/09/2026', 'STIPENDIO', '', '2100,00'] },
        ],
        totalNonEmptyRows: 3,
        samplesTruncated: false,
      }],
    });

    const resolved = resolvedMapping(profile);
    expect(resolved.date).toEqual({ columnIndex: 0, parser: 'dmy-slash' });
    expect(resolved.descriptionColumnIndexes).toEqual([1]);
    expect(resolved.amount).toEqual({
      strategy: 'debit-credit',
      debitColumnIndex: 2,
      creditColumnIndex: 3,
    });
  });

  it('resolves a conventional signed amount only when sampled signs support it', () => {
    const profile = profileSpreadsheet({
      sourceKind: 'csv',
      csvDelimiter: ',',
      sheets: [{
        id: 'sheet-1',
        name: 'CSV',
        state: 'visible',
        rows: [
          { rowNumber: 1, cells: ['Booking Date', 'Details', 'Amount'] },
          { rowNumber: 2, cells: ['2026-09-01', 'Grocery', '-42.00'] },
          { rowNumber: 3, cells: ['2026-09-02', 'Salary', '2200.00'] },
        ],
        totalNonEmptyRows: 3,
        samplesTruncated: false,
      }],
    });

    expect(resolvedMapping(profile).amount).toEqual({
      strategy: 'signed-negative-expense',
      columnIndex: 2,
    });
  });

  it('does not guess unknown semantic headers', () => {
    const profile = profileSpreadsheet({
      sourceKind: 'csv',
      csvDelimiter: ',',
      sheets: [{
        id: 'sheet-1',
        name: 'CSV',
        state: 'visible',
        rows: [
          { rowNumber: 1, cells: ['Column A', 'Column B', 'Column C'] },
          { rowNumber: 2, cells: ['2026-09-01', 'Grocery', '-42.00'] },
        ],
        totalNonEmptyRows: 2,
        samplesTruncated: false,
      }],
    });

    expect(inferDeterministicImportV2Mapping(profile)).toEqual({ status: 'unresolved' });
  });

  it('keeps competing date roles unresolved', () => {
    const profile = profileSpreadsheet({
      sourceKind: 'csv',
      csvDelimiter: ',',
      sheets: [{
        id: 'sheet-1',
        name: 'CSV',
        state: 'visible',
        rows: [
          { rowNumber: 1, cells: ['Booking Date', 'Value Date', 'Description', 'Amount'] },
          { rowNumber: 2, cells: ['2026-09-01', '2026-09-02', 'Grocery', '-42.00'] },
        ],
        totalNonEmptyRows: 2,
        samplesTruncated: false,
      }],
    });

    expect(inferDeterministicImportV2Mapping(profile)).toEqual({ status: 'unresolved' });
  });
});
