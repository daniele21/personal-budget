import { describe, expect, it, vi } from 'vitest';
import { readRawImportV2Document } from '../rawImportV2DocumentReader';

describe('readRawImportV2Document', () => {
  it('keeps a quoted-row CSV as source-shaped single-cell rows instead of rejecting semantic structure', async () => {
    const file = new File([
      '"Data Operazione;Causale;Uscite;Entrate"\n',
      '"12/09/2026;SUPERMERCATO;43,20;"\n',
      '"13/09/2026;STIPENDIO;;2100,00"\n',
      '"14/09/2026;RISTORANTE;31,50;"\n',
    ], 'synthetic.csv', { type: 'text/csv' });

    const result = await readRawImportV2Document(file);
    expect(result.kind).toBe('read');
    if (result.kind !== 'read') return;

    expect(result.document.sourceKind).toBe('csv');
    expect(result.document.sheets[0]?.rows).toEqual([
      { rowNumber: 1, cells: ['Data Operazione;Causale;Uscite;Entrate'] },
      { rowNumber: 2, cells: ['12/09/2026;SUPERMERCATO;43,20;'] },
      { rowNumber: 3, cells: ['13/09/2026;STIPENDIO;;2100,00'] },
      { rowNumber: 4, cells: ['14/09/2026;RISTORANTE;31,50;'] },
    ]);
  });

  it('performs no network work while retaining bounded source content', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const file = new File([
        'When|Memo|Debit|Credit\n',
        '2026-09-12|Synthetic market|12.00|\n',
      ], 'synthetic.csv');
      await expect(readRawImportV2Document(file)).resolves.toEqual(expect.objectContaining({ kind: 'read' }));
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('rejects invalid UTF-8 before content can reach interpretation', async () => {
    const file = new File([new Uint8Array([0xff, 0xfe, 0xfd])], 'invalid.csv');
    await expect(readRawImportV2Document(file)).resolves.toEqual({
      kind: 'rejected',
      reason: 'invalid_csv_encoding',
    });
  });
});
