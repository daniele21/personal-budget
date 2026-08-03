const TEMPLATE_HEADER = ['date', 'description', 'amount'];

export function buildStructuredImportCsvTemplate(): Blob {
  return new Blob([`${TEMPLATE_HEADER.join(',')}\r\n`], { type: 'text/csv;charset=utf-8' });
}

export async function buildStructuredImportXlsxTemplate(): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transactions');
  worksheet.addRow(TEMPLATE_HEADER);
  worksheet.columns = [
    { key: 'date', width: 14 },
    { key: 'description', width: 36 },
    { key: 'amount', width: 16 },
  ];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

