import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateImportSummary,
  createDescriptionMatchKey,
  type PreparedImportRow,
  type PreparedTransactionImport,
  type StructuredImportValidationResult,
} from '../../../domain/import';
import { profileSpreadsheet } from '../../../domain/import/v2';

const mocks = vi.hoisted(() => ({
  readTransactionImportFile: vi.fn(),
  inferImportV2SchemaWithHarnex: vi.fn(),
  executeImportV2Mapping: vi.fn(),
  prepareTransactionImport: vi.fn(),
  resolveImportV2Categories: vi.fn(),
  commitPreparedTransactionImport: vi.fn(),
  commitExistingTransactionImport: vi.fn(),
  undoTransactionImport: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../platform/platformCapabilities', () => ({
  getPlatformCapabilities: () => ({
    platform: 'android',
    isNative: true,
    isAndroid: true,
    serviceWorkerSupported: false,
    browserNotificationsSupported: false,
    paymentDetectionSupported: true,
    harnexSupported: true,
  }),
}));

vi.mock('../../../services/import', () => ({
  readTransactionImportFile: mocks.readTransactionImportFile,
  inferImportV2SchemaWithHarnex: mocks.inferImportV2SchemaWithHarnex,
  executeImportV2Mapping: mocks.executeImportV2Mapping,
  prepareTransactionImport: mocks.prepareTransactionImport,
  resolveImportV2Categories: mocks.resolveImportV2Categories,
}));

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    categories: ['Food'],
    transactions: [],
    addCategory: vi.fn(),
    commitPreparedTransactionImport: mocks.commitPreparedTransactionImport,
    commitExistingTransactionImport: mocks.commitExistingTransactionImport,
    undoTransactionImport: mocks.undoTransactionImport,
  }),
}));

vi.mock('../../Toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

vi.mock('../FileUploadStep', () => ({
  FileUploadStep: ({ onFileSelected }: { onFileSelected: (file: File) => void }) => (
    <button type="button" onClick={() => onFileSelected(new File(['synthetic'], 'wrapped.csv', { type: 'text/csv' }))}>
      Choose quoted file
    </button>
  ),
}));

import { ImportWizardDialog } from '../ImportWizardDialog';

const profile = profileSpreadsheet({
  sourceKind: 'csv',
  csvDelimiter: ';',
  sheets: [{
    id: 'sheet-1:delimited-cell:semicolon',
    name: 'CSV',
    state: 'visible',
    rows: [
      { rowNumber: 1, cells: ['Data Operazione', 'Causale', 'Uscite', 'Entrate'] },
      { rowNumber: 2, cells: ['12/09/2026', 'SUPERMERCATO', '43,20', ''] },
      { rowNumber: 3, cells: ['13/09/2026', 'STIPENDIO', '', '2100,00'] },
      { rowNumber: 4, cells: ['14/09/2026', 'RISTORANTE', '31,50', ''] },
    ],
    totalNonEmptyRows: 4,
    samplesTruncated: false,
  }],
});

const header = profile.sheets[0]!.headerCandidates[0]!;
const dateCandidate = header.dateCandidates.find(({ parser }) => parser === 'dmy-slash')!;
const amountCandidate = header.amountCandidates.find(({ strategy }) => strategy === 'debit-credit')!;
const descriptionColumnId = header.descriptionCandidateColumnIds.find((id) =>
  header.columns.find((column) => column.id === id)?.header === 'Causale'
)!;

const validation: StructuredImportValidationResult = {
  sourceKind: 'structured-csv',
  rows: [
    { sourceRowNumber: 2, date: '2026-09-12', description: 'SUPERMERCATO', signedAmountMinor: -4320, issues: [] },
    { sourceRowNumber: 3, date: '2026-09-13', description: 'STIPENDIO', signedAmountMinor: 210000, issues: [] },
    { sourceRowNumber: 4, date: '2026-09-14', description: 'RISTORANTE', signedAmountMinor: -3150, issues: [] },
  ],
  issues: [],
  hasBlockingIssues: false,
};

function preparedImport(): PreparedTransactionImport {
  const rows: PreparedImportRow[] = validation.rows.map((row, index) => {
    const type = row.signedAmountMinor! < 0 ? 'expense' as const : 'income' as const;
    return {
      rowId: `row-${index + 1}`,
      sourceRowNumber: row.sourceRowNumber,
      date: row.date!,
      description: row.description!,
      signedAmountMinor: row.signedAmountMinor!,
      type,
      category: 'Uncategorized',
      categorySource: 'uncategorized',
      included: true,
      selectedForBatch: false,
      descriptionMatchKey: createDescriptionMatchKey(row.description!, type),
      duplicateMatches: [],
      issues: [],
    };
  });
  return {
    sourceKind: 'structured-csv',
    preparedAt: '2026-09-18T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

describe('ImportWizardDialog deterministic-first Import V2', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.readTransactionImportFile.mockResolvedValue({ kind: 'mapping-required', profile });
    mocks.executeImportV2Mapping.mockResolvedValue(validation);
    mocks.prepareTransactionImport.mockResolvedValue(preparedImport());
    mocks.resolveImportV2Categories.mockResolvedValue({
      suggestions: [],
      unresolvedRowIds: [],
      harnex: { status: 'not-needed', completedBatches: 0, totalBatches: 0 },
    });
  });

  it('recognizes the localized debit/credit shape locally and shows a four-step preview', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose quoted file' }));

    expect(await screen.findByText('Check what Aura found')).toBeInTheDocument();
    expect(screen.getByText('Data Operazione', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Causale', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Uscite = expenses · Entrate = income')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Import progress' })).toHaveAttribute(
      'aria-valuetext',
      'Check preview, step 2 of 4',
    );
    expect(mocks.inferImportV2SchemaWithHarnex).not.toHaveBeenCalled();
    expect(mocks.executeImportV2Mapping).not.toHaveBeenCalled();
  });

  it('continues through deterministic extraction before category review', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose quoted file' }));
    await screen.findByText('Check what Aura found');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mocks.executeImportV2Mapping).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'wrapped.csv' }),
      profile,
      {
        dateCandidateId: dateCandidate.id,
        amountCandidateId: amountCandidate.id,
        descriptionColumnIds: [descriptionColumnId],
        typeColumnId: null,
      },
    ));
    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    expect(mocks.prepareTransactionImport).toHaveBeenCalledWith(validation, []);
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });

  it('keeps technical amount strategies out of the manual editor', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose quoted file' }));
    await screen.findByText('Check what Aura found');

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const amount = screen.getByLabelText('Amount') as HTMLSelectElement;
    const labels = Array.from(amount.options).map((option) => option.text);
    expect(labels).toContain('Uscite = expenses · Entrate = income · CSV');
    expect(labels.some((label) => /signed amount|positive expenses|debit \/ credit/i.test(label))).toBe(false);
    expect(amount.options).toHaveLength(2);
  });
});
