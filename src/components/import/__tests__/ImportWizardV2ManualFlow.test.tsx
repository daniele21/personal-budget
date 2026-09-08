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
  executeImportV2Mapping: vi.fn(),
  prepareTransactionImport: vi.fn(),
  commitPreparedTransactionImport: vi.fn(),
  commitExistingTransactionImport: vi.fn(),
  undoTransactionImport: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../services/import', () => ({
  readTransactionImportFile: mocks.readTransactionImportFile,
  executeImportV2Mapping: mocks.executeImportV2Mapping,
  prepareTransactionImport: mocks.prepareTransactionImport,
}));

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    categories: ['Groceries'],
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
      Choose unknown file
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
      rowId: `row-${index}`,
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
    preparedAt: '2026-09-08T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

describe('ImportWizardDialog Import V2 manual flow', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.readTransactionImportFile.mockResolvedValue({ kind: 'mapping-required', profile });
    mocks.executeImportV2Mapping.mockResolvedValue(validation);
    mocks.prepareTransactionImport.mockResolvedValue(preparedImport());
  });

  it('requires explicit mapping confirmation before entering the existing Review path', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose unknown file' }));

    expect(await screen.findByText('Check the columns Aura should use')).toBeInTheDocument();
    expect(mocks.executeImportV2Mapping).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: 'Confirm mapping' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Transaction date'), { target: { value: dateCandidate.id } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amountCandidate.id } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Details/ }));
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(mocks.executeImportV2Mapping).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'bank.csv' }),
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

  it('ignores a stale extraction result after the session is closed', async () => {
    let resolveExecution: ((value: StructuredImportValidationResult) => void) | undefined;
    mocks.executeImportV2Mapping.mockReturnValue(new Promise((resolve) => {
      resolveExecution = resolve;
    }));
    const onClose = vi.fn();
    render(<ImportWizardDialog isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose unknown file' }));
    await screen.findByText('Check the columns Aura should use');
    fireEvent.change(screen.getByLabelText('Transaction date'), { target: { value: dateCandidate.id } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amountCandidate.id } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Details/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Validating locally');

    fireEvent.click(screen.getAllByRole('button', { name: 'Close import wizard' }).at(-1)!);
    expect(onClose).toHaveBeenCalledTimes(1);
    resolveExecution?.(validation);

    await waitFor(() => expect(mocks.prepareTransactionImport).not.toHaveBeenCalled());
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });

  it('can cancel manual mapping without creating a partial commit', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose unknown file' }));
    await screen.findByText('Check the columns Aura should use');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('button', { name: 'Choose unknown file' })).toBeInTheDocument();
    expect(mocks.executeImportV2Mapping).not.toHaveBeenCalled();
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });
});
