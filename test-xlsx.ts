import * as XLSX from 'xlsx';
import * as fs from 'fs';

const buffer = fs.readFileSync('lista_operazioni_03052026.csv');
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
console.log("Row 23:", rawData[23]);
console.log("Row 30:", rawData[30]);
