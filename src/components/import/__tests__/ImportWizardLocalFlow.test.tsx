import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateImportSummary,
  createDescriptionMatchKey,
  type PreparedImportRow,
  type PreparedTransactionImport,
  type StructuredImportValidationResult,
} from '../../../domain/import';
import type { Transaction } from '../../../types';

const mocks = vi.hoisted(() => ({
  readTransactionImportFile: vi.fn(),
  prepareTransactionImport: vi.fn(),
  commitPreparedTransactionImport: vi.fn(),
  commitExistingTransactionImport: vi.fn(),
  undoTransactionImport: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../services/import', () => ({
  readTransactionImportFile: mocks.readTransactionImportFile,
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
  FileUploadStep: ({ onFileSelected, validationIssues, errorMessage }: {
    onFileSelected: (file: File) => void;
    validationIssues?: Array<{ code: string }>;
    errorMessage?: string | null;
  }) => (
    <div>
      <p>Processed only on this device</p>
      <button type="button" onClick={() => onFileSelected(new File(['fixture'], 'transactions.csv'))}>
        Choose synthetic file
      </button>
      {validationIssues?.map((issue) => <p key={issue.code}>{issue.code}</p>)}
      {errorMessage && <p>{errorMessage}</p>}
    </div>
  ),
}));

import { ImportWizardDialog } from '../ImportWizardDialog';

const validation: StructuredImportValidationResult = {
  sourceKind: 'structured-csv',
  rows: [],
  issues: [],
  hasBlockingIssues: false,
};

function preparedImport(): PreparedTransactionImport {
  const rows: PreparedImportRow[] = [1, 2].map((index) => {
    const description = `Synthetic ${index}`;
    return {
      rowId: `row-${index}`,
      sourceRowNumber: index + 1,
      date: '2026-08-01',
      description,
      signedAmountMinor: -1000,
      type: 'expense',
      category: 'Uncategorized',
      categorySource: 'uncategorized',
      included: true,
      selectedForBatch: false,
      descriptionMatchKey: createDescriptionMatchKey(description, 'expense'),
      duplicateMatches: index === 1 ? [{ source: 'ledger', referenceId: 'existing', count: 1 }] : [],
      issues: [],
    };
  });
  return {
    sourceKind: 'structured-csv',
    preparedAt: '2026-08-03T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

describe('ImportWizardDialog local flow', () => {
  beforeEach(() => {
    mocks.readTransactionImportFile.mockReset();
    mocks.prepareTransactionImport.mockReset();
    mocks.commitPreparedTransactionImport.mockReset();
    mocks.commitExistingTransactionImport.mockReset();
    mocks.undoTransactionImport.mockReset();
    mocks.toast.mockReset();
  });

  it('validates, reviews, confirms Uncategorized and imports without provider calls', async () => {
    const prepared = preparedImport();
    const imported: Transaction[] = prepared.rows.map((row, index) => ({
      id: `secure-${index}`,
      amount: Math.abs(row.signedAmountMinor) / 100,
      type: row.type,
      category: row.category,
      date: `${row.date}T00:00:00.000Z`,
      title: row.description,
      description: row.description,
      paymentMethod: 'Bank Transfer',
    }));
    mocks.readTransactionImportFile.mockResolvedValue({ kind: 'structured', sheetName: 'CSV', validation });
    mocks.prepareTransactionImport.mockResolvedValue(prepared);
    mocks.commitPreparedTransactionImport.mockResolvedValue({
      data: { transactions: imported },
      importedTransactions: imported,
      undoToken: { imported },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);

    expect(screen.queryByText(/Gemini|Google|AI Analysis/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose synthetic file' }));
    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review 2 transactions' }));
    expect(await screen.findByText(/2 included transactions are still Uncategorized/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Import with 2 Uncategorized' }));

    await waitFor(() => expect(mocks.commitPreparedTransactionImport).toHaveBeenCalledWith(prepared));
    expect(await screen.findByText('Import complete')).toBeInTheDocument();
    expect(screen.getByText('1', { selector: 'p' })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('keeps the review available when verified persistence fails', async () => {
    mocks.readTransactionImportFile.mockResolvedValue({ kind: 'structured', sheetName: 'CSV', validation });
    mocks.prepareTransactionImport.mockResolvedValue(preparedImport());
    mocks.commitPreparedTransactionImport.mockRejectedValue(new Error('Storage quota reached.'));
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose synthetic file' }));
    await screen.findByText('Categorize and review');
    fireEvent.click(screen.getByRole('button', { name: 'Review 2 transactions' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Import with 2 Uncategorized' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Storage quota reached. You can retry');
    expect(screen.getByRole('button', { name: 'Import with 2 Uncategorized' })).toBeEnabled();
    expect(screen.queryByText('Import complete')).not.toBeInTheDocument();
  });

  it('keeps blocking validation in the upload step for a corrected file', async () => {
    mocks.readTransactionImportFile.mockResolvedValue({
      kind: 'structured',
      sheetName: 'CSV',
      validation: { ...validation, hasBlockingIssues: true, issues: [{ code: 'date_invalid', severity: 'error', messageKey: 'import.issue.date_invalid' }] },
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose synthetic file' }));
    expect(await screen.findByText('date_invalid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose synthetic file' })).toBeEnabled();
    expect(mocks.prepareTransactionImport).not.toHaveBeenCalled();
  });

  it('announces the local validating state while file reading is pending', async () => {
    let resolveRead: ((value: unknown) => void) | undefined;
    mocks.readTransactionImportFile.mockReturnValue(new Promise((resolve) => {
      resolveRead = resolve;
    }));
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose synthetic file' }));
    mocks.prepareTransactionImport.mockResolvedValue(preparedImport());
    expect(await screen.findByRole('status')).toHaveTextContent('Validating locally');
    resolveRead?.({ kind: 'structured', sheetName: 'CSV', validation });
    await screen.findByText('Categorize and review');
  });

  it('warns before closing a prepared session-only review', async () => {
    mocks.readTransactionImportFile.mockResolvedValue({ kind: 'structured', sheetName: 'CSV', validation });
    mocks.prepareTransactionImport.mockResolvedValue(preparedImport());
    const onClose = vi.fn();
    render(<ImportWizardDialog isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose synthetic file' }));
    await screen.findByText('Categorize and review');
    fireEvent.click(screen.getAllByRole('button', { name: 'Close import wizard' }).at(-1)!);
    expect(screen.getByRole('dialog', { name: 'Discard import review?' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
