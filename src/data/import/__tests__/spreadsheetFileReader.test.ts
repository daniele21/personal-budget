import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';
import { AURA_ARCHIVE_MAGIC_TEXT } from '../../../domain/archive';
import {
  preflightXlsxContainer,
} from '../spreadsheetFileReader';
import { readTransactionImportFile as readSpreadsheetImportFile } from '../../../services/import/readTransactionImportFile';

const FIXTURES = resolve(process.cwd(), 'tests/fixtures/import');
const TODAY = '2026-08-03';

function csvFixture(name: string): File {
  return new File([readFileSync(resolve(FIXTURES, name))], name, { type: 'text/csv' });
}

async function workbookFile(
  configure: (workbook: ExcelJS.Workbook) => void,
  name = 'transactions.xlsx',
): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  configure(workbook);
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('spreadsheetFileReader CSV', () => {
  it('reads the canonical comma fixture entirely locally', async () => {
    const result = await readSpreadsheetImportFile(csvFixture('valid-comma.csv'), { today: TODAY });
    expect(result.kind).toBe('structured');
    if (result.kind !== 'structured') return;
    expect(result.validation.rows).toHaveLength(4);
    expect(result.validation.rows[0]?.signedAmountMinor).toBe(-4270);
    expect(result.validation.rows[2]?.signedAmountMinor).toBe(250000);
    expect(result.validation.issues).toContainEqual(expect.objectContaining({ code: 'future_date' }));
    expect(result.validation.hasBlockingIssues).toBe(false);
  });

  it('has no network path while classifying and validating a file', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await readSpreadsheetImportFile(csvFixture('valid-comma.csv'), { today: TODAY });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('supports semicolon CSV with one comma decimal convention', async () => {
    const result = await readSpreadsheetImportFile(
      csvFixture('valid-semicolon-comma-decimal.csv'),
      { today: TODAY },
    );
    expect(result.kind).toBe('structured');
    if (result.kind !== 'structured') return;
    expect(result.validation.rows.map((row) => row.signedAmountMinor)).toEqual([-3245, 1500, -90000]);
    expect(result.validation.hasBlockingIssues).toBe(false);
  });

  it.each([
    ['invalid-header.csv', ['header_unknown', 'header_order']],
    ['invalid-rows.csv', ['date_invalid', 'description_required', 'amount_zero', 'amount_precision', 'row_column_count']],
    ['mixed-decimals.csv', ['mixed_decimal_format']],
  ])('returns the expected issue codes for %s', async (fixture, expectedCodes) => {
    const result = await readSpreadsheetImportFile(csvFixture(fixture), { today: TODAY });
    expect(result.kind).toBe('structured');
    if (result.kind !== 'structured') return;
    const codes = result.validation.issues.map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(expectedCodes));
    expect(result.validation.hasBlockingIssues).toBe(true);
  });

  it('keeps formula-like CSV descriptions as inert text', async () => {
    const result = await readSpreadsheetImportFile(csvFixture('formula-like-description.csv'), { today: TODAY });
    expect(result.kind).toBe('structured');
    if (result.kind !== 'structured') return;
    expect(result.validation.rows.map((row) => row.description)).toEqual([
      '=HYPERLINK("https://invalid.example","Synthetic")',
      '@SyntheticReference',
    ]);
    expect(result.validation.hasBlockingIssues).toBe(false);
  });

  it('routes the Aura legacy CSV before V1 validation', async () => {
    const result = await readSpreadsheetImportFile(csvFixture('aura-legacy.csv'), { today: TODAY });
    expect(result.kind).toBe('aura-legacy-csv');
  });

  it('stops on the Aura binary signature before spreadsheet parsing', async () => {
    const file = new File([AURA_ARCHIVE_MAGIC_TEXT, new Uint8Array(4)], 'renamed.csv');
    await expect(readSpreadsheetImportFile(file)).resolves.toEqual({ kind: 'aura-archive' });
  });

  it('rejects unsupported extensions and outer size limits', async () => {
    const unsupported = new File(['x'], 'transactions.xls');
    expect(await readSpreadsheetImportFile(unsupported)).toEqual({
      kind: 'rejected',
      issues: [expect.objectContaining({ code: 'unsupported_file_type' })],
    });

    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'transactions.csv');
    const result = await readSpreadsheetImportFile(oversized);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.issues[0]?.code).toBe('file_too_large');
  });

  it('rejects malformed syntax and non-UTF-8 bytes with dedicated safe issues', async () => {
    const malformed = new File([
      'date,description,amount\n2026-08-01,"Unclosed,-1.00\n',
    ], 'malformed.csv');
    const malformedResult = await readSpreadsheetImportFile(malformed, { today: TODAY });
    expect(malformedResult.kind).toBe('structured');
    if (malformedResult.kind === 'structured') {
      expect(malformedResult.validation.issues).toContainEqual(
        expect.objectContaining({ code: 'invalid_csv_syntax' }),
      );
    }

    const invalidUtf8 = new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'invalid.csv');
    const encodingResult = await readSpreadsheetImportFile(invalidUtf8, { today: TODAY });
    expect(encodingResult.kind).toBe('structured');
    if (encodingResult.kind === 'structured') {
      expect(encodingResult.validation.issues).toContainEqual(
        expect.objectContaining({ code: 'invalid_csv_encoding' }),
      );
    }
  });

  it('accepts exactly 20,000 data rows and aborts on the next non-empty row', async () => {
    const header = 'date,description,amount\n';
    const acceptedFile = new File([
      header,
      Array.from({ length: 20_000 }, (_, index) => `2026-08-01,Synthetic ${index},-1.00`).join('\n'),
    ], 'accepted.csv');
    const accepted = await readSpreadsheetImportFile(acceptedFile, { today: TODAY });
    expect(accepted.kind).toBe('structured');
    if (accepted.kind === 'structured') {
      expect(accepted.validation.rows).toHaveLength(20_000);
      expect(accepted.validation.issues.some((issue) => issue.code === 'row_limit_exceeded')).toBe(false);
    }

    const rejectedFile = new File([
      header,
      Array.from({ length: 20_001 }, (_, index) => `2026-08-01,Synthetic ${index},-1.00`).join('\n'),
    ], 'rejected.csv');
    const rejectedResult = await readSpreadsheetImportFile(rejectedFile, { today: TODAY });
    expect(rejectedResult.kind).toBe('structured');
    if (rejectedResult.kind === 'structured') {
      expect(rejectedResult.validation.rows).toHaveLength(20_000);
      expect(rejectedResult.validation.issues).toContainEqual(
        expect.objectContaining({ code: 'row_limit_exceeded' }),
      );
    }
  });
});

describe('spreadsheetFileReader XLSX', () => {
  it('reads numeric amounts and calendar-safe date cells', async () => {
    const file = await workbookFile((workbook) => {
      const sheet = workbook.addWorksheet('Transactions');
      sheet.addRows([
        ['date', 'description', 'amount'],
        [new Date('2026-08-01T00:00:00.000Z'), 'Synthetic Grocery', -42.7],
        ['2026-08-02', 'Synthetic Salary', 2500],
      ]);
    });
    const result = await readSpreadsheetImportFile(file, { today: TODAY });
    expect(result.kind).toBe('structured');
    if (result.kind !== 'structured') return;
    expect(result.validation.rows.map(({ date, signedAmountMinor }) => ({ date, signedAmountMinor }))).toEqual([
      { date: '2026-08-01', signedAmountMinor: -4270 },
      { date: '2026-08-02', signedAmountMinor: 250000 },
    ]);
  });

  it('warns about hidden first and ignored additional worksheets', async () => {
    const file = await workbookFile((workbook) => {
      const first = workbook.addWorksheet('Hidden Transactions', { state: 'hidden' });
      first.addRows([['date', 'description', 'amount'], ['2026-08-01', 'Synthetic', -1]]);
      workbook.addWorksheet('Ignored').addRow(['not', 'read', 'here']);
    });
    const result = await readSpreadsheetImportFile(file, { today: TODAY });
    expect(result.kind).toBe('structured');
    if (result.kind !== 'structured') return;
    expect(result.validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'hidden_first_worksheet', severity: 'warning' }),
      expect.objectContaining({ code: 'additional_worksheets_ignored', severity: 'warning' }),
    ]));
    expect(result.validation.hasBlockingIssues).toBe(false);
  });

  it('rejects formula and merged cells', async () => {
    const file = await workbookFile((workbook) => {
      const sheet = workbook.addWorksheet('Transactions');
      sheet.addRows([
        ['date', 'description', 'amount'],
        ['2026-08-01', 'Synthetic', -1],
        ['2026-08-02', 'Merged', -2],
      ]);
      sheet.getCell('B2').value = { formula: 'CONCAT("Syn","thetic")', result: 'Synthetic' };
      sheet.mergeCells('A3:B3');
      sheet.addRow(['2026-08-03', 'No cached result', { formula: '1+1' }]);
    });
    const result = await readSpreadsheetImportFile(file, { today: TODAY });
    expect(result.kind).toBe('structured');
    if (result.kind !== 'structured') return;
    expect(result.validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'formula_cell_not_supported', column: 'description' }),
      expect.objectContaining({ code: 'formula_cell_not_supported', column: 'amount' }),
      expect.objectContaining({ code: 'merged_cell_not_supported' }),
    ]));
    expect(result.validation.hasBlockingIssues).toBe(true);
  });

  it('rejects invalid ZIPs and declared expanded resource overflow before ExcelJS', async () => {
    expect(preflightXlsxContainer(new Uint8Array([1, 2, 3]))).toEqual({
      ok: false,
      code: 'invalid_xlsx_container',
    });

    const validFile = await workbookFile((workbook) => {
      workbook.addWorksheet('Transactions').addRows([
        ['date', 'description', 'amount'],
        ['2026-08-01', 'Synthetic', -1],
      ]);
    });
    const bytes = new Uint8Array(await validFile.arrayBuffer());
    const view = new DataView(bytes.buffer);
    let centralOffset = -1;
    for (let index = 0; index <= bytes.length - 4; index += 1) {
      if (view.getUint32(index, true) === 0x02014b50) {
        centralOffset = index;
        break;
      }
    }
    expect(centralOffset).toBeGreaterThanOrEqual(0);
    view.setUint32(centralOffset + 24, 32 * 1024 * 1024 + 1, true);
    expect(preflightXlsxContainer(bytes)).toEqual({ ok: false, code: 'xlsx_resource_limit' });
  });

  it('reports an empty workbook worksheet without fallback rows', async () => {
    const file = await workbookFile((workbook) => {
      workbook.addWorksheet('Transactions');
    });
    const result = await readSpreadsheetImportFile(file, { today: TODAY });
    expect(result.kind).toBe('structured');
    if (result.kind === 'structured') {
      expect(result.validation.rows).toHaveLength(0);
      expect(result.validation.issues[0]?.code).toBe('empty_file');
    }
  });

  it('rejects a workbook with no worksheet', async () => {
    const file = await workbookFile(() => undefined);
    const result = await readSpreadsheetImportFile(file, { today: TODAY });
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.issues[0]?.code).toBe('worksheet_missing');
  });

  it('rejects excessive ZIP entry declarations and encrypted entries', async () => {
    const file = await workbookFile((workbook) => {
      workbook.addWorksheet('Transactions').addRows([
        ['date', 'description', 'amount'],
        ['2026-08-01', 'Synthetic', -1],
      ]);
    });
    const original = new Uint8Array(await file.arrayBuffer());
    const originalView = new DataView(original.buffer);
    let endOffset = -1;
    let centralOffset = -1;
    for (let index = 0; index <= original.length - 4; index += 1) {
      const signature = originalView.getUint32(index, true);
      if (signature === 0x02014b50 && centralOffset < 0) centralOffset = index;
      if (signature === 0x06054b50) endOffset = index;
    }
    expect(endOffset).toBeGreaterThanOrEqual(0);
    expect(centralOffset).toBeGreaterThanOrEqual(0);

    const excessiveEntries = original.slice();
    const excessiveView = new DataView(excessiveEntries.buffer);
    excessiveView.setUint16(endOffset + 8, 1_001, true);
    excessiveView.setUint16(endOffset + 10, 1_001, true);
    expect(preflightXlsxContainer(excessiveEntries)).toEqual({ ok: false, code: 'xlsx_resource_limit' });

    const encrypted = original.slice();
    const encryptedView = new DataView(encrypted.buffer);
    encryptedView.setUint16(centralOffset + 8, encryptedView.getUint16(centralOffset + 8, true) | 1, true);
    expect(preflightXlsxContainer(encrypted)).toEqual({ ok: false, code: 'xlsx_resource_limit' });
  });
});
