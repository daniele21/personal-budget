import { describe, expect, it } from 'vitest';
import { validateStructuredImport } from '../structuredImportValidation';
import type { RawStructuredImportRow } from '../structuredImportTypes';

const TODAY = '2026-08-03';

function validate(rows: RawStructuredImportRow[], csvDelimiter: ',' | ';' = ',') {
  return validateStructuredImport({
    sourceKind: 'structured-csv',
    rows,
    csvDelimiter,
    today: TODAY,
  });
}

describe('structuredImportValidation', () => {
  it('normalizes the header, descriptions and signed integer cents deterministically', () => {
    const result = validate([
      { rowNumber: 1, cells: ['\uFEFF Date ', ' Description ', ' Amount '] },
      { rowNumber: 2, cells: ['2026-08-01', '  Synthetic\nMerchant  ', '-42.70'] },
      { rowNumber: 3, cells: ['2026-08-04', '=Stored as text', '+12'] },
    ]);

    expect(result.hasBlockingIssues).toBe(false);
    expect(result.rows).toEqual([
      {
        sourceRowNumber: 2,
        date: '2026-08-01',
        description: 'Synthetic Merchant',
        signedAmountMinor: -4270,
        issues: [],
      },
      {
        sourceRowNumber: 3,
        date: '2026-08-04',
        description: '=Stored as text',
        signedAmountMinor: 1200,
        issues: [expect.objectContaining({ code: 'future_date', severity: 'warning' })],
      },
    ]);
  });

  it('returns precise header issues without leaking cell contents', () => {
    const result = validate([
      { rowNumber: 1, cells: ['description', 'date', 'value'] },
      { rowNumber: 2, cells: ['Synthetic', '2026-08-01', '-1.00'] },
    ]);

    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'header_unknown',
      'header_order',
    ]));
    expect(JSON.stringify(result.issues)).not.toContain('Synthetic');
  });

  it('distinguishes missing, wrong-count, duplicate and reordered headers', () => {
    expect(validate([]).issues[0]?.code).toBe('empty_file');
    expect(validate([{ rowNumber: 1, cells: ['date', 'description'] }]).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['header_column_count', 'header_order', 'empty_file']));
    expect(validate([{ rowNumber: 1, cells: ['date', 'date', 'amount'] }]).issues.map((issue) => issue.code))
      .toEqual(expect.arrayContaining(['header_duplicate', 'header_order', 'empty_file']));
  });

  it('distinguishes required, format, calendar, precision, zero and range errors', () => {
    const result = validate([
      { rowNumber: 1, cells: ['date', 'description', 'amount'] },
      { rowNumber: 2, cells: ['', 'Valid', '-1'] },
      { rowNumber: 3, cells: ['03/08/2026', 'Valid', '-1'] },
      { rowNumber: 4, cells: ['2026-02-30', 'Valid', '-1'] },
      { rowNumber: 5, cells: ['2026-08-01', 'Valid', '1e3'] },
      { rowNumber: 6, cells: ['2026-08-01', 'Valid', '-1.234'] },
      { rowNumber: 7, cells: ['2026-08-01', 'Valid', '-0.00'] },
      { rowNumber: 8, cells: ['2026-08-01', 'Valid', '1000000000.00'] },
    ]);

    expect(result.rows.map((row) => row.issues[0]?.code)).toEqual([
      'date_required',
      'date_format',
      'date_invalid',
      'amount_format',
      'amount_precision',
      'amount_zero',
      'amount_out_of_range',
    ]);
  });

  it('enforces description code-point and control-character limits', () => {
    const result = validate([
      { rowNumber: 1, cells: ['date', 'description', 'amount'] },
      { rowNumber: 2, cells: ['2026-08-01', '😀'.repeat(2_001), '-1'] },
      { rowNumber: 3, cells: ['2026-08-01', 'Control\tcharacter', '-1'] },
      { rowNumber: 4, cells: ['2026-08-01', '   ', '-1'] },
    ]);

    expect(result.rows.map((row) => row.issues[0]?.code)).toEqual([
      'description_too_long',
      'description_control_character',
      'description_required',
    ]);
  });

  it('detects mixed decimal formats only for semicolon CSV', () => {
    const result = validate([
      { rowNumber: 1, cells: ['date', 'description', 'amount'] },
      { rowNumber: 2, cells: ['2026-08-01', 'Dot', '-10.50'] },
      { rowNumber: 3, cells: ['2026-08-02', 'Comma', '-12,50'] },
    ], ';');

    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'mixed_decimal_format' }));
  });

  it('accepts the exact amount boundary and rejects the next cent', () => {
    const result = validate([
      { rowNumber: 1, cells: ['date', 'description', 'amount'] },
      { rowNumber: 2, cells: ['2026-08-01', 'Maximum', '999999999.99'] },
      { rowNumber: 3, cells: ['2026-08-01', 'Minimum', '-999999999.99'] },
      { rowNumber: 4, cells: ['2026-08-01', 'Overflow', '1000000000.00'] },
    ]);
    expect(result.rows.map((row) => row.signedAmountMinor)).toEqual([
      99_999_999_999,
      -99_999_999_999,
      undefined,
    ]);
    expect(result.rows[2]?.issues[0]?.code).toBe('amount_out_of_range');
  });

  it('rejects formula and merged cells by required column', () => {
    const result = validate([
      { rowNumber: 1, cells: ['date', 'description', 'amount'] },
      {
        rowNumber: 2,
        cells: ['2026-08-01', { kind: 'formula' }, -1],
        mergedColumns: ['date'],
      },
    ]);

    expect(result.rows[0]?.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'formula_cell_not_supported', column: 'description' }),
      expect.objectContaining({ code: 'merged_cell_not_supported', column: 'date' }),
    ]));
  });
});
