import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  buildStructuredImportCsvTemplate,
  buildStructuredImportXlsxTemplate,
} from '../importTemplateBuilder';

describe('importTemplateBuilder', () => {
  it('builds the canonical UTF-8 CSV header locally', async () => {
    const blob = buildStructuredImportCsvTemplate();
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(await blob.text()).toBe('date,description,amount\r\n');
  });

  it('builds an XLSX with the same exact ordered header', async () => {
    const blob = await buildStructuredImportXlsxTemplate();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    const sheet = workbook.worksheets[0];
    expect(sheet?.name).toBe('Transactions');
    expect([1, 2, 3].map((column) => sheet?.getCell(1, column).value)).toEqual([
      'date',
      'description',
      'amount',
    ]);
  });
});
