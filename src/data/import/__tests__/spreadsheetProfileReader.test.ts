import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';
import type {
  HeaderCandidate,
  SpreadsheetProfile,
} from '../../../domain/import/v2';
import {
  readSpreadsheetProfile,
  type SpreadsheetProfileReadResult,
} from '../spreadsheetProfileReader';

const CSV_FIXTURES = resolve(process.cwd(), 'tests/fixtures/import-v2/csv');
const XLSX_CASES = resolve(process.cwd(), 'tests/fixtures/import-v2/xlsx-cases.json');

type XlsxCell = string | number | null;
type XlsxWorksheetSpec = {
  name: string;
  rows: XlsxCell[][];
  formulaCells?: Array<{ cell: string; formula: string; result: number }>;
  mergedRanges?: string[];
};
type XlsxCaseSpec = { worksheets: XlsxWorksheetSpec[] };

function csvFixture(name: string): File {
  return new File([readFileSync(resolve(CSV_FIXTURES, name))], name, { type: 'text/csv' });
}

function profileFrom(result: SpreadsheetProfileReadResult): SpreadsheetProfile {
  expect(result.kind).toBe('profiled');
  if (result.kind !== 'profiled') throw new Error(`Expected profile, got ${result.reason}`);
  return result.profile;
}

function headerFor(profile: SpreadsheetProfile, sheetName = 'CSV'): HeaderCandidate {
  const sheet = profile.sheets.find(({ name }) => name === sheetName);
  expect(sheet).toBeDefined();
  const header = sheet?.headerCandidates[0];
  expect(header).toBeDefined();
  if (!header) throw new Error(`No header candidate for ${sheetName}`);
  return header;
}

function columnLabel(header: HeaderCandidate, columnId: string): string {
  return header.columns.find(({ id }) => id === columnId)?.header ?? '';
}

function signedCandidateHeaders(header: HeaderCandidate): string[] {
  return header.amountCandidates.flatMap((candidate) => {
    if (candidate.strategy !== 'signed-negative-expense') return [];
    return [columnLabel(header, candidate.columnId)];
  });
}

async function workbookCaseFile(caseName: string): Promise<File> {
  const cases = JSON.parse(readFileSync(XLSX_CASES, 'utf8')) as Record<string, XlsxCaseSpec>;
  const spec = cases[caseName];
  if (!spec) throw new Error(`Missing XLSX fixture case ${caseName}`);

  const workbook = new ExcelJS.Workbook();
  for (const worksheetSpec of spec.worksheets) {
    const worksheet = workbook.addWorksheet(worksheetSpec.name);
    worksheet.addRows(worksheetSpec.rows);
    for (const formula of worksheetSpec.formulaCells ?? []) {
      worksheet.getCell(formula.cell).value = { formula: formula.formula, result: formula.result };
    }
    for (const range of worksheetSpec.mergedRanges ?? []) worksheet.mergeCells(range);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], `${caseName}.xlsx`, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('spreadsheetProfileReader CSV', () => {
  it.each([
    ['canonical-v1.csv', 1, 'date', 'iso-date'],
    ['weak-headers.csv', 1, 'Column A', 'dmy-slash'],
    ['title-rows.csv', 4, 'Date', 'iso-date'],
    ['european-decimal.csv', 1, 'Data', 'dmy-slash'],
  ])('profiles %s with bounded header/date candidates', async (fixture, rowNumber, dateHeader, parser) => {
    const profile = profileFrom(await readSpreadsheetProfile(csvFixture(fixture)));
    const header = headerFor(profile);
    expect(header.rowNumber).toBe(rowNumber);
    expect(header.dateCandidates).toContainEqual(expect.objectContaining({
      parser,
      columnId: header.columns.find(({ header: label }) => label === dateHeader)?.id,
    }));
  });

  it('emits debit-credit and amount-direction strategies from executable Aura candidates', async () => {
    const debitCredit = headerFor(profileFrom(await readSpreadsheetProfile(csvFixture('it-debit-credit.csv'))));
    const debitCreditCandidate = debitCredit.amountCandidates.find(({ strategy }) => strategy === 'debit-credit');
    expect(debitCreditCandidate?.strategy).toBe('debit-credit');
    if (debitCreditCandidate?.strategy === 'debit-credit') {
      expect([
        columnLabel(debitCredit, debitCreditCandidate.debitColumnId),
        columnLabel(debitCredit, debitCreditCandidate.creditColumnId),
      ]).toEqual(['Dare', 'Avere']);
    }

    const amountDirection = headerFor(profileFrom(await readSpreadsheetProfile(csvFixture('amount-direction.csv'))));
    const amountDirectionCandidate = amountDirection.amountCandidates.find(
      ({ strategy }) => strategy === 'amount-direction',
    );
    expect(amountDirectionCandidate?.strategy).toBe('amount-direction');
    if (amountDirectionCandidate?.strategy === 'amount-direction') {
      expect(columnLabel(amountDirection, amountDirectionCandidate.amountColumnId)).toBe('Amount');
      expect(columnLabel(amountDirection, amountDirectionCandidate.directionColumnId)).toBe('Direction');
    }
  });

  it('keeps financial ambiguities explicit and supports split descriptions', async () => {
    const dateAmbiguity = headerFor(
      profileFrom(await readSpreadsheetProfile(csvFixture('booking-value-date.csv'))),
    );
    expect(dateAmbiguity.dateCandidates.map(({ columnId }) => columnLabel(dateAmbiguity, columnId))).toEqual(
      expect.arrayContaining(['Booking Date', 'Value Date']),
    );

    const amountAmbiguity = headerFor(
      profileFrom(await readSpreadsheetProfile(csvFixture('amount-balance.csv'))),
    );
    expect(signedCandidateHeaders(amountAmbiguity)).toEqual(expect.arrayContaining(['Amount', 'Balance']));

    const splitDescription = headerFor(
      profileFrom(await readSpreadsheetProfile(csvFixture('split-description.csv'))),
    );
    expect(splitDescription.descriptionCandidateColumnIds.map((id) => columnLabel(splitDescription, id))).toEqual(
      expect.arrayContaining(['Merchant', 'Details']),
    );
  });

  it('offers the positive-expense strategy only as an Aura-owned executable option', async () => {
    const header = headerFor(profileFrom(await readSpreadsheetProfile(csvFixture('positive-expense.csv'))));
    const candidate = header.amountCandidates.find(({ strategy }) => strategy === 'signed-positive-expense');
    expect(candidate?.strategy).toBe('signed-positive-expense');
    if (candidate?.strategy === 'signed-positive-expense') {
      expect(columnLabel(header, candidate.columnId)).toBe('Debit Amount');
    }
  });

  it('rejects malformed/invalid encodings and never calls the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      await expect(readSpreadsheetProfile(csvFixture('malformed.csv'))).resolves.toEqual({
        kind: 'rejected',
        reason: 'invalid_csv_syntax',
      });
      const invalidUtf8 = new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'invalid.csv');
      await expect(readSpreadsheetProfile(invalidUtf8)).resolves.toEqual({
        kind: 'rejected',
        reason: 'invalid_csv_encoding',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('bounds retained samples and rejects excessive column count', async () => {
    const bounded = new File([
      'Date,Description,Amount\n',
      Array.from({ length: 100 }, (_, index) => `2026-09-01,Synthetic ${index},-${index + 1}.00`).join('\n'),
    ], 'bounded.csv');
    const profile = profileFrom(await readSpreadsheetProfile(bounded));
    expect(profile.sheets[0]?.samplesTruncated).toBe(true);
    for (const column of headerFor(profile).columns) expect(column.samples.length).toBeLessThanOrEqual(8);

    const tooManyColumns = new File([
      `${Array.from({ length: 65 }, (_, index) => `Column ${index}`).join(',')}\n`,
      `${Array.from({ length: 65 }, () => 'x').join(',')}\n`,
    ], 'wide.csv');
    await expect(readSpreadsheetProfile(tooManyColumns)).resolves.toEqual({
      kind: 'rejected',
      reason: 'column_limit_exceeded',
    });
  });
});

describe('spreadsheetProfileReader XLSX', () => {
  it('profiles all bounded worksheets and finds the intended transaction sheet', async () => {
    const profile = profileFrom(await readSpreadsheetProfile(await workbookCaseFile('multi-sheet')));
    expect(profile.sheets.map(({ name }) => name)).toEqual(['Cover', 'Transactions']);
    const header = headerFor(profile, 'Transactions');
    expect(header.rowNumber).toBe(1);
    expect(header.dateCandidates.map(({ columnId }) => columnLabel(header, columnId))).toContain('Date');
  });

  it('finds title-row and debit-credit XLSX candidates', async () => {
    const titled = profileFrom(await readSpreadsheetProfile(await workbookCaseFile('title-rows')));
    expect(headerFor(titled, 'Movements').rowNumber).toBe(3);

    const debitCredit = headerFor(
      profileFrom(await readSpreadsheetProfile(await workbookCaseFile('debit-credit'))),
      'Movimenti',
    );
    const candidate = debitCredit.amountCandidates.find(({ strategy }) => strategy === 'debit-credit');
    expect(candidate?.strategy).toBe('debit-credit');
  });

  it('does not create executable candidates from formula or merged required cells', async () => {
    const formulaHeader = headerFor(
      profileFrom(await readSpreadsheetProfile(await workbookCaseFile('formula-required-cell'))),
      'Transactions',
    );
    const formulaAmount = formulaHeader.columns.find(({ header }) => header === 'Amount');
    expect(formulaAmount?.formulaCount).toBe(1);
    expect(formulaHeader.amountCandidates.some((candidate) => (
      'columnId' in candidate && candidate.columnId === formulaAmount?.id
    ))).toBe(false);

    const mergedHeader = headerFor(
      profileFrom(await readSpreadsheetProfile(await workbookCaseFile('merged-required-cell'))),
      'Transactions',
    );
    const mergedDate = mergedHeader.columns.find(({ header }) => header === 'Date');
    expect(mergedDate?.mergedCellCount).toBeGreaterThan(0);
    expect(mergedHeader.dateCandidates.some(({ columnId }) => columnId === mergedDate?.id)).toBe(false);
  });

  it('reuses the authoritative XLSX container resource preflight', async () => {
    const file = await workbookCaseFile('resource-overflow');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let centralOffset = -1;
    for (let index = 0; index <= bytes.length - 4; index += 1) {
      if (view.getUint32(index, true) === 0x02014b50) {
        centralOffset = index;
        break;
      }
    }
    expect(centralOffset).toBeGreaterThanOrEqual(0);
    view.setUint32(centralOffset + 24, 32 * 1024 * 1024 + 1, true);
    const mutated = new File([bytes], 'resource-overflow.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await expect(readSpreadsheetProfile(mutated)).resolves.toEqual({
      kind: 'rejected',
      reason: 'xlsx_resource_limit',
    });
  });
});
