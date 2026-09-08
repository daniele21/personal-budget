import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Outcome = 'resolved' | 'ambiguous' | 'unsupported' | 'rejected';
type AmountStrategy =
  | 'signed-negative-expense'
  | 'signed-positive-expense'
  | 'debit-credit'
  | 'amount-direction';

type CorpusCase = {
  id: string;
  format: 'csv' | 'xlsx';
  source: string;
  outcome: Outcome;
  expected: {
    amount?: { strategy: AmountStrategy; headers: string[] };
    dateCandidates?: string[];
    amountCandidates?: string[];
    transactionCount?: number;
    [key: string]: unknown;
  };
};

const ROOT = resolve(process.cwd(), 'tests/fixtures/import-v2');
const cases = JSON.parse(readFileSync(resolve(ROOT, 'cases.json'), 'utf8')) as CorpusCase[];
const xlsxCases = JSON.parse(
  readFileSync(resolve(ROOT, 'xlsx-cases.json'), 'utf8'),
) as Record<string, unknown>;

describe('Transaction Import V2 fixture corpus', () => {
  it('keeps a broad, uniquely identified multi-source golden set', () => {
    expect(cases.length).toBeGreaterThanOrEqual(18);
    expect(new Set(cases.map(({ id }) => id)).size).toBe(cases.length);
    expect(new Set(cases.map(({ outcome }) => outcome))).toEqual(
      new Set<Outcome>(['resolved', 'ambiguous', 'unsupported', 'rejected']),
    );
    expect(cases.some(({ format }) => format === 'csv')).toBe(true);
    expect(cases.some(({ format }) => format === 'xlsx')).toBe(true);
  });

  it('covers every frozen executable amount strategy', () => {
    const strategies = new Set(
      cases.flatMap(({ expected }) => (expected.amount ? [expected.amount.strategy] : [])),
    );
    expect(strategies).toEqual(
      new Set<AmountStrategy>([
        'signed-negative-expense',
        'signed-positive-expense',
        'debit-credit',
        'amount-direction',
      ]),
    );
  });

  it('keeps ambiguous financial meanings explicit instead of blessing one answer', () => {
    const ambiguous = cases.filter(({ outcome }) => outcome === 'ambiguous');
    expect(ambiguous.length).toBeGreaterThanOrEqual(2);
    expect(
      ambiguous.every(
        ({ expected }) =>
          (expected.dateCandidates?.length ?? 0) > 1 ||
          (expected.amountCandidates?.length ?? 0) > 1,
      ),
    ).toBe(true);
  });

  it('references only committed CSV fixtures or declared XLSX generators', () => {
    for (const fixture of cases) {
      const [sourcePath, fragment] = fixture.source.split('#');
      expect(existsSync(resolve(ROOT, sourcePath))).toBe(true);
      if (fixture.format === 'xlsx') {
        expect(sourcePath).toBe('xlsx-cases.json');
        expect(fragment).toBeTruthy();
        expect(Object.hasOwn(xlsxCases, fragment!)).toBe(true);
      } else {
        expect(fragment).toBeUndefined();
        expect(sourcePath.startsWith('csv/')).toBe(true);
      }
    }
  });

  it('keeps committed CSV examples obviously synthetic', () => {
    for (const fixture of cases.filter(({ format }) => format === 'csv')) {
      const contents = readFileSync(resolve(ROOT, fixture.source), 'utf8');
      expect(contents).toContain('Synthetic');
      expect(contents).not.toMatch(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/);
    }
  });
});
