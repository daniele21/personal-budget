import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  isSupportedFile,
  parseSpreadsheetFile,
  SUPPORTED_EXTENSIONS,
} from '../excelParser';

describe('excelParser', () => {
  it('parses CSV rows and trims cells', async () => {
    const file = new File([' Date , Description , Amount \n 2026-05-01 , Coffee , 2.50 \n'], 'bank.csv', {
      type: 'text/csv',
    });

    await expect(parseSpreadsheetFile(file)).resolves.toEqual({
      sheetName: 'CSV',
      rawRows: [
        ['Date', 'Description', 'Amount'],
        ['2026-05-01', 'Coffee', '2.50'],
      ],
    });
  });

  it('parses XLSX rows from the first worksheet', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');
    worksheet.addRows([
      ['Date', 'Description', 'Amount'],
      [new Date('2026-05-01T00:00:00.000Z'), 'Salary', 1200],
    ]);
    const buffer = await workbook.xlsx.writeBuffer();
    const file = new File([buffer], 'bank.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await expect(parseSpreadsheetFile(file)).resolves.toEqual({
      sheetName: 'Transactions',
      rawRows: [
        ['Date', 'Description', 'Amount'],
        ['2026-05-01T00:00:00.000Z', 'Salary', '1200'],
      ],
    });
  });

  it('supports only current non-vulnerable import formats', async () => {
    expect(SUPPORTED_EXTENSIONS).toEqual(['.xlsx', '.csv']);
    expect(isSupportedFile('statement.xlsx')).toBe(true);
    expect(isSupportedFile('statement.csv')).toBe(true);
    expect(isSupportedFile('legacy.xls')).toBe(false);
  });
});
