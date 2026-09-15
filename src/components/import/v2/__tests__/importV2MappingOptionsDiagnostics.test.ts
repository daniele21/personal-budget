import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileSpreadsheet } from '../../../../domain/import/v2';
import {
  beginImportV2DiagnosticAttempt,
  getImportV2Diagnostics,
  resetImportV2DiagnosticsForTests,
} from '../../../../lib/importV2Diagnostics';
import { createImportV2MappingChoices } from '../importV2MappingOptions';

describe('Import V2 mapping option diagnostics', () => {
  beforeEach(() => {
    resetImportV2DiagnosticsForTests();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('makes an empty date picker visible in the trace without logging labels or samples', () => {
    beginImportV2DiagnosticAttempt('csv');
    const profile = profileSpreadsheet({
      sourceKind: 'csv',
      csvDelimiter: ',',
      sheets: [{
        id: 'sheet-1',
        name: 'CSV',
        state: 'visible',
        rows: [
          { rowNumber: 1, cells: ['Memo', 'Value'] },
          { rowNumber: 2, cells: ['SENSITIVE-MEMO', '-42.00'] },
          { rowNumber: 3, cells: ['SECOND-MEMO', '-18.00'] },
        ],
        totalNonEmptyRows: 3,
        samplesTruncated: false,
      }],
    });
    const incomplete = {
      ...profile,
      sheets: profile.sheets.map((sheet) => ({
        ...sheet,
        headerCandidates: sheet.headerCandidates.map((header) => ({
          ...header,
          dateCandidates: [],
        })),
      })),
    };

    const choices = createImportV2MappingChoices(incomplete);
    expect(choices.dateOptions).toEqual([]);

    expect(getImportV2Diagnostics()).toContainEqual(expect.objectContaining({
      stage: 'mapping-options',
      result: 'incomplete',
      details: expect.objectContaining({
        dateOptions: 0,
        amountOptions: expect.any(Number),
        descriptionOptions: expect.any(Number),
      }),
    }));

    const serialized = JSON.stringify(getImportV2Diagnostics());
    expect(serialized).not.toContain('SENSITIVE-MEMO');
    expect(serialized).not.toContain('SECOND-MEMO');
  });
});
