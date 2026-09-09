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

vi.mock('../../../services/import', () => ({
  readTransactionImportFile: mocks.readTransactionImportFile,
  inferImportV2SchemaWithHarnex: mocks.inferImportV2SchemaWithHarnex,
  executeImportV2Mapping: mocks.executeImportV2Mapping,
  prepareTransactionImport: mocks.prepareTransactionImport,
  resolveImportV2Categories: mocks.resolveImportV2Categories,
}));

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    categories: ['Groceries', 'Income'],
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
    <button type="button" onClick={() => onFileSelected(new File(['fixture'], 'assisted.csv', { type: 'text/csv' }))}>
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
      { rowNumber: 3, cells: ['2026-09-02', 'Synthetic Salary', '2200.00'] },
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
    { sourceRowNumber: 3, date: '2026-09-02', description: 'Synthetic Salary', signedAmountMinor: 220000, issues: [] },
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
    preparedAt: '2026-09-09T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

describe('ImportWizardDialog Import V2 assisted convergence', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.readTransactionImportFile.mockResolvedValue({ kind: 'mapping-required', profile });
    mocks.inferImportV2SchemaWithHarnex.mockResolvedValue({
      status: 'resolved',
      suggestion: { sheetId: 'sheet-1', headerCandidateId: header.id, selection },
    });
    mocks.executeImportV2Mapping.mockResolvedValue(validation);
    mocks.prepareTransactionImport.mockResolvedValue(preparedImport());
  });

  it('prefills a resolved Harnex mapping but never auto-confirms it', async () => {
    mocks.resolveImportV2Categories.mockResolvedValue({
      suggestions: [
        { groupId: 'group-1', rowIds: ['row-1'], category: 'Groceries', source: 'harnex' },
        { groupId: 'group-2', rowIds: ['row-2'], category: 'Income', source: 'harnex' },
      ],
      unresolvedRowIds: [],
      harnex: { status: 'completed', completedBatches: 1, totalBatches: 1 },
    });

    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose assisted file' }));

    expect(await screen.findByText('Suggested mapping ready')).toBeInTheDocument();
    expect(screen.getByLabelText('Transaction date')).toHaveValue(dateCandidate.id);
    expect(screen.getByLabelText('Amount')).toHaveValue(amountCandidate.id);
    expect(screen.getByRole('checkbox', { name: /Details/ })).toBeChecked();
    expect(mocks.executeImportV2Mapping).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    await waitFor(() => expect(mocks.executeImportV2Mapping).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'assisted.csv' }),
      profile,
      selection,
    ));
    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Income').length).toBeGreaterThan(0);
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });

  it('keeps successful suggestions reviewable after partial category failure', async () => {
    mocks.resolveImportV2Categories.mockResolvedValue({
      suggestions: [{ groupId: 'group-1', rowIds: ['row-1'], category: 'Groceries', source: 'harnex' }],
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
    expect(screen.getByText(/1 of 2 groups completed/)).toBeInTheDocument();
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue manually' }));
    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 transaction groups received category suggestions/)).toBeInTheDocument();
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Uncategorized').length).toBeGreaterThan(0);
  });

  it('preserves completed category suggestions when retry later becomes unavailable', async () => {
    mocks.resolveImportV2Categories
      .mockResolvedValueOnce({
        suggestions: [{ groupId: 'group-1', rowIds: ['row-1'], category: 'Groceries', source: 'harnex' }],
        unresolvedRowIds: ['row-2'],
        harnex: {
          status: 'partial-failure',
          completedBatches: 1,
          totalBatches: 2,
          failure: { code: 'CONNECTION_LOST', message: 'Connection lost.' },
        },
      })
      .mockResolvedValueOnce({
        suggestions: [],
        unresolvedRowIds: ['row-1', 'row-2'],
        harnex: {
          status: 'unavailable',
          completedBatches: 0,
          totalBatches: 0,
          failure: { code: 'MODEL_UNAVAILABLE', message: 'Model unavailable.' },
        },
      });

    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose assisted file' }));
    await screen.findByText('Suggested mapping ready');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));

    expect(await screen.findByText('Some suggestions could not be completed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Continue without assistance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue manually' }));

    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Uncategorized').length).toBeGreaterThan(0);
    expect(mocks.resolveImportV2Categories).toHaveBeenCalledTimes(2);
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });

  it('falls back to editable mapping when schema assistance is ambiguous', async () => {
    mocks.inferImportV2SchemaWithHarnex.mockResolvedValue({ status: 'ambiguous', ambiguities: ['amount'] });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose assisted file' }));

    expect(await screen.findByText('Check the columns Aura should use')).toBeInTheDocument();
    expect(screen.getByText(/more than one safe interpretation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm mapping' })).toBeDisabled();
    expect(mocks.executeImportV2Mapping).not.toHaveBeenCalled();
  });
});
