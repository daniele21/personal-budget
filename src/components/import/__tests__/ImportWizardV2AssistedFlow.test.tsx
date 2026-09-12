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
import type { Transaction } from '../../../types';

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
    categories: ['Groceries', 'Travel'],
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
    <button
      type="button"
      onClick={() => onFileSelected(new File(['synthetic'], 'bank.csv', { type: 'text/csv' }))}
    >
      Choose assisted file
    </button>
  ),
}));

import { ImportWizardDialog } from '../ImportWizardDialog';

const profile = profileSpreadsheet({
  sourceKind: 'csv',
  csvDelimiter: ',',
  sheets: [{
    id: 'sheet-1',
    name: 'CSV',
    state: 'visible',
    rows: [
      { rowNumber: 1, cells: ['Booking Date', 'Details', 'Amount'] },
      { rowNumber: 2, cells: ['2026-09-01', 'Synthetic Grocery', '-42.00'] },
      { rowNumber: 3, cells: ['2026-09-02', 'Synthetic Taxi', '-18.00'] },
    ],
    totalNonEmptyRows: 3,
    samplesTruncated: false,
  }],
});

const header = profile.sheets[0]!.headerCandidates[0]!;
const dateCandidate = header.dateCandidates[0]!;
const amountCandidate = header.amountCandidates.find(({ strategy }) => strategy === 'signed-negative-expense')!;
const descriptionColumnId = header.descriptionCandidateColumnIds[0]!;
const selection = {
  dateCandidateId: dateCandidate.id,
  amountCandidateId: amountCandidate.id,
  descriptionColumnIds: [descriptionColumnId],
  typeColumnId: null,
};

const validation: StructuredImportValidationResult = {
  sourceKind: 'structured-csv',
  rows: [
    { sourceRowNumber: 2, date: '2026-09-01', description: 'Synthetic Grocery', signedAmountMinor: -4200, issues: [] },
    { sourceRowNumber: 3, date: '2026-09-02', description: 'Synthetic Taxi', signedAmountMinor: -1800, issues: [] },
  ],
  issues: [],
  hasBlockingIssues: false,
};

function preparedImport(): PreparedTransactionImport {
  const rows: PreparedImportRow[] = validation.rows.map((row, index) => ({
    rowId: `row-${index + 1}`,
    sourceRowNumber: row.sourceRowNumber,
    date: row.date!,
    description: row.description!,
    signedAmountMinor: row.signedAmountMinor!,
    type: 'expense',
    category: 'Uncategorized',
    categorySource: 'uncategorized',
    included: true,
    selectedForBatch: false,
    descriptionMatchKey: createDescriptionMatchKey(row.description!, 'expense'),
    duplicateMatches: [],
    issues: [],
  }));
  return {
    sourceKind: 'structured-csv',
    preparedAt: '2026-09-09T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

function resolvedSchema() {
  return {
    status: 'resolved' as const,
    suggestion: {
      sheetId: profile.sheets[0]!.id,
      headerCandidateId: header.id,
      selection,
    },
  };
}

function importedTransactions(): Transaction[] {
  return validation.rows.map((row, index) => ({
    id: `imported-${index + 1}`,
    amount: Math.abs(row.signedAmountMinor!) / 100,
    type: 'expense',
    category: index === 0 ? 'Groceries' : 'Travel',
    date: `${row.date}T00:00:00.000Z`,
    title: row.description!,
    description: row.description!,
    paymentMethod: 'Bank Transfer',
  }));
}

describe('ImportWizardDialog Import V2 assisted flow', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.readTransactionImportFile.mockResolvedValue({ kind: 'mapping-required', profile });
    mocks.inferImportV2SchemaWithHarnex.mockResolvedValue(resolvedSchema());
    mocks.executeImportV2Mapping.mockResolvedValue(validation);
    mocks.prepareTransactionImport.mockResolvedValue(preparedImport());
    mocks.resolveImportV2Categories.mockResolvedValue({
      suggestions: [
        { groupId: 'group-1', rowIds: ['row-1'], category: 'Groceries', source: 'local-history' },
        { groupId: 'group-2', rowIds: ['row-2'], category: 'Travel', source: 'harnex' },
      ],
      unresolvedRowIds: [],
      harnex: { status: 'completed', completedBatches: 1, totalBatches: 1 },
    });
  });

  it('reviews an assisted mapping, applies category suggestions, then uses the existing verified commit', async () => {
    const imported = importedTransactions();
    mocks.commitPreparedTransactionImport.mockResolvedValue({
      data: { transactions: imported },
      importedTransactions: imported,
      undoToken: { imported },
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose assisted file' }));
    expect(await screen.findByText('Suggested mapping ready')).toBeInTheDocument();
    expect(screen.getByLabelText('Transaction date')).toHaveValue(dateCandidate.id);
    expect(screen.getByLabelText('Amount')).toHaveValue(amountCandidate.id);
    expect(screen.getByRole('checkbox', { name: /Details/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));

    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    expect(screen.getByText('Groceries', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Travel', { exact: true })).toBeInTheDocument();
    expect(mocks.resolveImportV2Categories).toHaveBeenCalledWith(
      expect.objectContaining({ rows: expect.any(Array) }),
      [],
      ['Groceries', 'Travel'],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Review 2 transactions' }));
    expect(await screen.findByText('Every included transaction has a category.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import 2 transactions' }));

    await waitFor(() => expect(mocks.commitPreparedTransactionImport).toHaveBeenCalledOnce());
    const committed = mocks.commitPreparedTransactionImport.mock.calls[0]![0] as PreparedTransactionImport;
    expect(committed.rows.map((row) => [row.category, row.categorySource])).toEqual([
      ['Groceries', 'local-history'],
      ['Travel', 'harnex'],
    ]);
  });

  it('keeps manual mapping first-class when Aura is not authorized for assistance', async () => {
    mocks.inferImportV2SchemaWithHarnex.mockResolvedValue({
      status: 'assistance-unavailable',
      failure: { code: 'UNAUTHORIZED', message: 'Not authorized.' },
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose assisted file' }));
    expect(await screen.findByText('Continue without assistance')).toBeInTheDocument();
    expect(screen.getByText('Optional import assistance is not allowed for this Aura build.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue manually' }));

    expect(await screen.findByText('Check the columns Aura should use')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm mapping' })).toBeDisabled();
    expect(mocks.executeImportV2Mapping).not.toHaveBeenCalled();
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });

  it('fails an ambiguous assisted schema closed to editable manual mapping', async () => {
    mocks.inferImportV2SchemaWithHarnex.mockResolvedValue({
      status: 'ambiguous',
      ambiguities: ['date'],
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose assisted file' }));
    expect(await screen.findByText('Aura needs your confirmation')).toBeInTheDocument();
    expect(screen.getByText(/could not safely choose one mapping/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm mapping' })).toBeDisabled();
    expect(mocks.executeImportV2Mapping).not.toHaveBeenCalled();
  });

  it('preserves successful category suggestions when a later assistance batch fails', async () => {
    mocks.resolveImportV2Categories.mockResolvedValue({
      suggestions: [
        { groupId: 'group-1', rowIds: ['row-1'], category: 'Groceries', source: 'harnex' },
      ],
      unresolvedRowIds: ['row-2'],
      harnex: {
        status: 'partial-failure',
        completedBatches: 1,
        totalBatches: 2,
        failure: { code: 'CONNECTION_LOST', message: 'Connection lost.' },
      },
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose assisted file' }));
    await screen.findByText('Suggested mapping ready');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));

    expect(await screen.findByText('Some suggestions could not be completed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue manually' }));
    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    expect(screen.getByText('Groceries', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Needs category')).toBeInTheDocument();
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });
});
