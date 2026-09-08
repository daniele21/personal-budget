import { describe, expect, it } from 'vitest';
import {
  extractImportV2Rows,
  resolveImportV2Mapping,
  ImportV2MappingError,
} from '../mapping';
import {
  profileSpreadsheet,
  type AmountCandidate,
  type HeaderCandidate,
  type ProfileRowInput,
  type ProfileWorkbookInput,
} from '../profile';

function rows(values: Array<Array<string | number | Date | undefined>>): ProfileRowInput[] {
  return values.map((cells, index) => ({ rowNumber: index + 1, cells }));
}

function workbook(
  values: Array<Array<string | number | Date | undefined>>,
  sourceKind: 'csv' | 'xlsx' = 'csv',
): ProfileWorkbookInput {
  return {
    sourceKind,
    ...(sourceKind === 'csv' ? { csvDelimiter: ';' as const } : {}),
    sheets: [{
      id: 'sheet-1',
      name: sourceKind === 'csv' ? 'CSV' : 'Transactions',
      state: 'visible',
      rows: rows(values),
      totalNonEmptyRows: values.length,
      samplesTruncated: false,
    }],
  };
}

function selection(header: HeaderCandidate, strategy: AmountCandidate['strategy']) {
  const amount = header.amountCandidates.find((candidate) => candidate.strategy === strategy);
  expect(amount).toBeDefined();
  expect(header.dateCandidates[0]).toBeDefined();
  expect(header.descriptionCandidateColumnIds[0]).toBeDefined();
  return {
    dateCandidateId: header.dateCandidates[0]!.id,
    amountCandidateId: amount!.id,
    descriptionColumnIds: [header.descriptionCandidateColumnIds[0]!],
    typeColumnId: null,
  };
}

function extract(values: Array<Array<string | number | Date | undefined>>, strategy: AmountCandidate['strategy']) {
  const input = workbook(values);
  const profile = profileSpreadsheet(input);
  const header = profile.sheets[0]!.headerCandidates[0]!;
  const resolved = resolveImportV2Mapping(profile, selection(header, strategy));
  return extractImportV2Rows(input.sheets[0]!.rows, resolved, {
    sourceKind: 'structured-csv',
    csvDelimiter: ';',
    today: '2026-09-30',
  });
}

describe('Import V2 deterministic mapping executor', () => {
  it('executes signed-negative-expense', () => {
    const result = extract([
      ['Date', 'Description', 'Amount'],
      ['2026-09-01', 'Synthetic Grocery', '-42.70'],
      ['2026-09-02', 'Synthetic Salary', '2500.00'],
    ], 'signed-negative-expense');

    expect(result.hasBlockingIssues).toBe(false);
    expect(result.rows.map(({ signedAmountMinor }) => signedAmountMinor)).toEqual([-4270, 250000]);
    expect(result.rows.map(({ date }) => date)).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('executes signed-positive-expense', () => {
    const result = extract([
      ['Date', 'Description', 'Debit Amount'],
      ['2026-09-01', 'Synthetic Grocery', '42.00'],
      ['2026-09-02', 'Synthetic Transit', '12.99'],
    ], 'signed-positive-expense');

    expect(result.hasBlockingIssues).toBe(false);
    expect(result.rows.map(({ signedAmountMinor }) => signedAmountMinor)).toEqual([-4200, -1299]);
  });

  it('executes debit-credit and normalizes DMY dates', () => {
    const result = extract([
      ['Data', 'Causale', 'Dare', 'Avere'],
      ['01/09/2026', 'Synthetic Grocery', '42,70', ''],
      ['02/09/2026', 'Synthetic Salary', '', '2500,00'],
    ], 'debit-credit');

    expect(result.hasBlockingIssues).toBe(false);
    expect(result.rows.map(({ signedAmountMinor }) => signedAmountMinor)).toEqual([-4270, 250000]);
    expect(result.rows.map(({ date }) => date)).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('executes amount-direction with Aura-owned direction semantics', () => {
    const result = extract([
      ['Date', 'Description', 'Amount', 'Direction'],
      ['2026-09-01', 'Synthetic Grocery', '42.00', 'Debit'],
      ['2026-09-02', 'Synthetic Salary', '2200.00', 'Credit'],
    ], 'amount-direction');

    expect(result.hasBlockingIssues).toBe(false);
    expect(result.rows.map(({ signedAmountMinor }) => signedAmountMinor)).toEqual([-4200, 220000]);
  });

  it('rejects unknown IDs and mappings that mix different tables', () => {
    const first = workbook([
      ['Date', 'Description', 'Amount'],
      ['2026-09-01', 'Synthetic A', '-1.00'],
    ], 'xlsx').sheets[0]!;
    const second = {
      ...workbook([
        ['Date', 'Description', 'Amount'],
        ['2026-09-02', 'Synthetic B', '-2.00'],
      ], 'xlsx').sheets[0]!,
      id: 'sheet-2',
      name: 'Other',
    };
    const profile = profileSpreadsheet({ sourceKind: 'xlsx', sheets: [first, second] });
    const firstHeader = profile.sheets[0]!.headerCandidates[0]!;
    const secondHeader = profile.sheets[1]!.headerCandidates[0]!;

    expect(() => resolveImportV2Mapping(profile, {
      dateCandidateId: 'missing-date',
      amountCandidateId: firstHeader.amountCandidates[0]!.id,
      descriptionColumnIds: [firstHeader.descriptionCandidateColumnIds[0]!],
    })).toThrowError(new ImportV2MappingError('unknown_candidate_id'));

    expect(() => resolveImportV2Mapping(profile, {
      dateCandidateId: firstHeader.dateCandidates[0]!.id,
      amountCandidateId: secondHeader.amountCandidates[0]!.id,
      descriptionColumnIds: [firstHeader.descriptionCandidateColumnIds[0]!],
    })).toThrowError(new ImportV2MappingError('mixed_header_mapping'));
  });

  it('fails closed on a non-EUR currency column', () => {
    const input = workbook([
      ['Date', 'Description', 'Amount', 'Currency'],
      ['2026-09-01', 'Synthetic USD purchase', '-10.00', 'USD'],
    ]);
    const profile = profileSpreadsheet(input);
    const header = profile.sheets[0]!.headerCandidates[0]!;
    const resolved = resolveImportV2Mapping(profile, selection(header, 'signed-negative-expense'));

    expect(() => extractImportV2Rows(input.sheets[0]!.rows, resolved, {
      sourceKind: 'structured-csv',
      csvDelimiter: ';',
      today: '2026-09-30',
    })).toThrowError(new ImportV2MappingError('unsupported_currency'));
  });
});
