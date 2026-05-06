import { describe, expect, it } from 'vitest';
import { normalizeImportedDate } from '../transactionCategorizer';

describe('normalizeImportedDate', () => {
  it('keeps ISO-like dates in date input format', () => {
    expect(normalizeImportedDate('2026-04-27')).toBe('2026-04-27');
    expect(normalizeImportedDate('2026/04/27 12:30')).toBe('2026-04-27');
  });

  it('parses European day-first bank export dates', () => {
    expect(normalizeImportedDate('27/04/2026', 'DD/MM/YYYY')).toBe('2026-04-27');
    expect(normalizeImportedDate('27.04.2026', 'DD.MM.YYYY')).toBe('2026-04-27');
    expect(normalizeImportedDate('27-04-26', 'DD-MM-YY')).toBe('2026-04-27');
  });

  it('parses month-first dates when the detected format says MM/DD/YYYY', () => {
    expect(normalizeImportedDate('04/27/2026', 'MM/DD/YYYY')).toBe('2026-04-27');
  });

  it('parses Excel serial dates from raw spreadsheet cells', () => {
    expect(normalizeImportedDate('46139')).toBe('2026-04-27');
  });

  it('returns undefined for invalid or empty dates', () => {
    expect(normalizeImportedDate('')).toBeUndefined();
    expect(normalizeImportedDate('not a date')).toBeUndefined();
    expect(normalizeImportedDate('31/02/2026', 'DD/MM/YYYY')).toBeUndefined();
  });
});
