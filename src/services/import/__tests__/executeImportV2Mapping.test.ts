import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { readSpreadsheetProfile } from '../../../data/import/spreadsheetProfileReader';
import type { HeaderCandidate, SpreadsheetProfile } from '../../../domain/import/v2';
import { executeImportV2Mapping } from '../executeImportV2Mapping';
import { readTransactionImportFile } from '../readTransactionImportFile';

const CSV_FIXTURES = resolve(process.cwd(), 'tests/fixtures/import-v2/csv');
const XLSX_CASES = resolve(process.cwd(), 'tests/fixtures/import-v2/xlsx-cases.json');

function csvFixture(name: string): File {
  return new File([readFileSync(resolve(CSV_FIXTURES, name))], name, { type: 'text/csv' });
}

async function profile(file: File): Promise<SpreadsheetProfile> {
  const result = await readSpreadsheetProfile(file);
  expect(result.kind).toBe('profiled');
  if (result.kind !== 'profiled') throw new Error(result.reason);
  return result.profile;
}

function headerFor(profileValue: SpreadsheetProfile, sheetName: string): HeaderCandidate {
  const header = profileValue.sheets.find(({ name }) => name === sheetName)?.headerCandidates[0];
  if (!header) throw new Error(`Missing header for ${sheetName}`);
  return header;
}

function columnId(header: HeaderCandidate, label: string): string {
  const id = header.columns.find(({ header: value }) => value === label)?.id;
  if (!id) throw new Error(`Missing ${label}`);
  return id;
}

async function multiSheetFile(): Promise<File> {
  const cases = JSON.parse(readFileSync(XLSX_CASES, 'utf8')) as Record<string, {
    worksheets: Array<{ name: string; rows: Array<Array<string | number | null>> }>;
  }>;
  const workbook = new ExcelJS.Workbook();
  for (const worksheetSpec of cases['multi-sheet']!.worksheets) {
    const worksheet = workbook.addWorksheet(worksheetSpec.name);
    worksheet.addRows(worksheetSpec.rows);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], 'multi-sheet.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('executeImportV2Mapping', () => {
  it('keeps canonical V1 on the existing fast path and profiles an unknown CSV', async () => {
    const v1 = await readTransactionImportFile(csvFixture('canonical-v1.csv'), { today: '2026-09-30' });
    expect(v1.kind).toBe('structured');
    if (v1.kind === 'structured') expect(v1.validation.hasBlockingIssues).toBe(false);

    const invalidV1 = await readTransactionImportFile(new File([
      'date,description,amount\nnot-a-date,Synthetic,-1.00\n',
    ], 'invalid-v1.csv'), { today: '2026-09-30' });
    expect(invalidV1.kind).toBe('structured');
    if (invalidV1.kind === 'structured') expect(invalidV1.validation.hasBlockingIssues).toBe(true);

    const unknown = await readTransactionImportFile(csvFixture('it-debit-credit.csv'), { today: '2026-09-30' });
    expect(unknown.kind).toBe('mapping-required');
  });

  it('executes a representative W1 debit-credit CSV into canonical validation rows', async () => {
    const file = csvFixture('it-debit-credit.csv');
    const profiled = await profile(file);
    const header = headerFor(profiled, 'CSV');
    const amount = header.amountCandidates.find(({ strategy }) => strategy === 'debit-credit');
    if (!amount) throw new Error('Missing debit-credit candidate');

    const validation = await executeImportV2Mapping(file, profiled, {
      dateCandidateId: header.dateCandidates.find(({ columnId: id }) => id === columnId(header, 'Data contabile'))!.id,
      amountCandidateId: amount.id,
      descriptionColumnIds: [columnId(header, 'Causale')],
    }, { today: '2026-09-30' });

    expect(validation.hasBlockingIssues).toBe(false);
    expect(validation.rows.map(({ signedAmountMinor }) => signedAmountMinor)).toEqual([-4270, 250000, -1299]);
    expect(validation.rows).toHaveLength(3);
  });

  it('rereads the selected worksheet for a representative W1 multi-sheet XLSX', async () => {
    const file = await multiSheetFile();
    const profiled = await profile(file);
    const header = headerFor(profiled, 'Transactions');
    const amountCandidate = header.amountCandidates.find((candidate) =>
      candidate.strategy === 'signed-negative-expense'
      && candidate.columnId === columnId(header, 'Amount'));
    if (!amountCandidate) throw new Error('Missing signed amount candidate');

    const validation = await executeImportV2Mapping(file, profiled, {
      dateCandidateId: header.dateCandidates.find(({ columnId: id }) => id === columnId(header, 'Date'))!.id,
      amountCandidateId: amountCandidate.id,
      descriptionColumnIds: [columnId(header, 'Description')],
    }, { today: '2026-09-30' });

    expect(validation.hasBlockingIssues).toBe(false);
    expect(validation.rows.map(({ description }) => description)).toEqual(['Synthetic Grocery', 'Synthetic Salary']);
    expect(validation.rows.map(({ signedAmountMinor }) => signedAmountMinor)).toEqual([-4270, 250000]);
  });
});
