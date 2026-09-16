import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateImportSummary,
  createDescriptionMatchKey,
  type PreparedImportRow,
  type PreparedTransactionImport,
  type StructuredImportValidationResult,
} from '../../../domain/import';
import {
  profileSpreadsheet,
  type ImportV2InterpretationProposal,
  type ImportV2RawDocument,
} from '../../../domain/import/v2';

const mocks = vi.hoisted(() => ({
  readTransactionImportFile: vi.fn(),
  inferImportV2PlanWithHarnex: vi.fn(),
  executeConfirmedImportV2Interpretation: vi.fn(),
  repairUnresolvedImportV2RowsWithHarnex: vi.fn(),
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
  inferImportV2PlanWithHarnex: mocks.inferImportV2PlanWithHarnex,
  executeConfirmedImportV2Interpretation: mocks.executeConfirmedImportV2Interpretation,
  repairUnresolvedImportV2RowsWithHarnex: mocks.repairUnresolvedImportV2RowsWithHarnex,
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
    <button
      type="button"
      onClick={() => onFileSelected(new File(['synthetic'], 'wrapped.csv', { type: 'text/csv' }))}
    >
      Choose raw file
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
      { rowNumber: 1, cells: ['Data Operazione;Causale;Uscite;Entrate'] },
      { rowNumber: 2, cells: ['12/09/2026;SUPERMERCATO;43,20;'] },
      { rowNumber: 3, cells: ['13/09/2026;STIPENDIO;;2100,00'] },
    ],
    totalNonEmptyRows: 3,
    samplesTruncated: false,
  }],
});

const rawDocument: ImportV2RawDocument = {
  contractVersion: 1,
  sourceKind: 'csv',
  sheets: [{
    id: 'sheet-1',
    name: 'CSV',
    state: 'visible',
    rows: [
      { rowNumber: 1, cells: ['Data Operazione;Causale;Uscite;Entrate'] },
      { rowNumber: 2, cells: ['12/09/2026;SUPERMERCATO;43,20;'] },
      { rowNumber: 3, cells: ['13/09/2026;STIPENDIO;;2100,00'] },
    ],
    totalNonEmptyRows: 3,
    samplesTruncated: false,
  }],
};

function proposal(proposalId = 'proposal-1', firstDescription = 'SUPERMERCATO'): ImportV2InterpretationProposal {
  return {
    proposalId,
    plan: {
      contractVersion: 1,
      sheetId: 'sheet-1',
      layout: {
        kind: 'delimited-cell',
        sourceColumnIndex: 0,
        delimiter: ';',
        stripOuterQuotes: false,
        headerRowNumber: 1,
        firstDataRowNumber: 2,
      },
      date: { columnIndex: 0, parser: 'dmy-slash' },
      description: { columnIndexes: [1] },
      amount: { strategy: 'debit-credit', debitColumnIndex: 2, creditColumnIndex: 3 },
    },
    preview: [
      {
        date: '2026-09-12',
        description: firstDescription,
        signedAmountMinor: -4320,
        type: 'expense',
        provenance: {
          sourceRowNumber: 2,
          dateColumnIndex: 0,
          descriptionColumnIndexes: [1],
          amountColumnIndexes: [2, 3],
        },
      },
      {
        date: '2026-09-13',
        description: 'STIPENDIO',
        signedAmountMinor: 210000,
        type: 'income',
        provenance: {
          sourceRowNumber: 3,
          dateColumnIndex: 0,
          descriptionColumnIndexes: [1],
          amountColumnIndexes: [2, 3],
        },
      },
    ],
    unresolvedSourceRowNumbers: [],
  };
}

const validation: StructuredImportValidationResult = {
  sourceKind: 'structured-csv',
  rows: [
    { sourceRowNumber: 2, date: '2026-09-12', description: 'SUPERMERCATO', signedAmountMinor: -4320, issues: [] },
    { sourceRowNumber: 3, date: '2026-09-13', description: 'STIPENDIO', signedAmountMinor: 210000, issues: [] },
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
    preparedAt: '2026-09-16T00:00:00.000Z',
    baseLedgerFingerprint: 'fingerprint',
    rows,
    issues: [],
    summary: calculateImportSummary(rows),
    undoStack: [],
  };
}

describe('ImportWizardDialog interactive Harnex interpretation', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.readTransactionImportFile.mockResolvedValue({ kind: 'mapping-required', profile, rawDocument });
    mocks.inferImportV2PlanWithHarnex.mockResolvedValue({ status: 'resolved', proposal: proposal() });
    mocks.executeConfirmedImportV2Interpretation.mockResolvedValue({ status: 'resolved', validation });
    mocks.prepareTransactionImport.mockResolvedValue(preparedImport());
    mocks.resolveImportV2Categories.mockResolvedValue({
      suggestions: [],
      unresolvedRowIds: [],
      harnex: { status: 'not-needed', completedBatches: 0, totalBatches: 0 },
    });
  });

  it('shows the deterministic Harnex preview before any full-file execution', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose raw file' }));

    expect(await screen.findByText('Check what Harnex understood')).toBeInTheDocument();
    expect(screen.getByText('SUPERMERCATO')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Import progress' })).toHaveAttribute(
      'aria-valuetext',
      'Check interpretation, step 3 of 7',
    );
    expect(mocks.inferImportV2PlanWithHarnex).toHaveBeenCalledWith(
      rawDocument,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mocks.executeConfirmedImportV2Interpretation).not.toHaveBeenCalled();
    expect(mocks.prepareTransactionImport).not.toHaveBeenCalled();
  });

  it('executes only the exact confirmed proposal and then continues into category review', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose raw file' }));
    await screen.findByText('Check what Harnex understood');

    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is correct' }));

    await waitFor(() => expect(mocks.executeConfirmedImportV2Interpretation).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'wrapped.csv' }),
      {
        status: 'confirmed',
        proposalId: 'proposal-1',
        plan: proposal().plan,
      },
    ));
    expect(mocks.repairUnresolvedImportV2RowsWithHarnex).not.toHaveBeenCalled();
    expect(mocks.prepareTransactionImport).toHaveBeenCalledWith(validation, []);
    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });

  it('executes bounded row repair after confirmation before category review', async () => {
    const unresolved = {
      status: 'unresolved' as const,
      validation,
      sourceRowNumbers: [3],
    };
    mocks.executeConfirmedImportV2Interpretation.mockResolvedValue(unresolved);
    mocks.repairUnresolvedImportV2RowsWithHarnex.mockResolvedValue({
      status: 'resolved',
      validation,
      repairedSourceRowNumbers: [3],
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose raw file' }));
    await screen.findByText('Check what Harnex understood');

    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is correct' }));

    await waitFor(() => expect(mocks.repairUnresolvedImportV2RowsWithHarnex).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'wrapped.csv' }),
      {
        status: 'confirmed',
        proposalId: 'proposal-1',
        plan: proposal().plan,
      },
      unresolved,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    expect(mocks.prepareTransactionImport).toHaveBeenCalledWith(validation, []);
    expect(await screen.findByText('Categorize and review')).toBeInTheDocument();
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });

  it('turns negative feedback into a complete revised proposal that must be confirmed again', async () => {
    mocks.inferImportV2PlanWithHarnex
      .mockResolvedValueOnce({ status: 'resolved', proposal: proposal('proposal-1', 'SUPERMERCATO') })
      .mockResolvedValueOnce({ status: 'resolved', proposal: proposal('proposal-2', 'SUPERMERCATO CENTRO') });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose raw file' }));
    await screen.findByText('SUPERMERCATO');

    fireEvent.click(screen.getByRole('button', { name: 'Something is wrong' }));
    fireEvent.click(screen.getByRole('radio', { name: /Amounts/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ask Harnex to revise' }));

    expect(await screen.findByText('SUPERMERCATO CENTRO')).toBeInTheDocument();
    await waitFor(() => expect(mocks.inferImportV2PlanWithHarnex).toHaveBeenCalledTimes(2));
    expect(mocks.inferImportV2PlanWithHarnex.mock.calls[1]![1]).toEqual(expect.objectContaining({
      signal: expect.any(AbortSignal),
      feedback: {
        area: 'amount',
        previousProposal: {
          proposalId: 'proposal-1',
          plan: proposal().plan,
        },
      },
    }));
    expect(mocks.executeConfirmedImportV2Interpretation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is correct' }));
    await waitFor(() => expect(mocks.executeConfirmedImportV2Interpretation).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ proposalId: 'proposal-2' }),
    ));
  });

  it('keeps unresolved full-file rows explicit, blocks preparation and exposes manual recovery', async () => {
    const unresolved = {
      status: 'unresolved' as const,
      validation,
      sourceRowNumbers: [9, 11],
    };
    mocks.executeConfirmedImportV2Interpretation.mockResolvedValue(unresolved);
    mocks.repairUnresolvedImportV2RowsWithHarnex.mockResolvedValue({
      status: 'unresolved',
      validation,
      sourceRowNumbers: [9, 11],
      repairedSourceRowNumbers: [],
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose raw file' }));
    await screen.findByText('Check what Harnex understood');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is correct' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('2 source rows still need a safe interpretation');
    expect(mocks.repairUnresolvedImportV2RowsWithHarnex).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Yes, this is correct' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Something is wrong' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Continue manually' })).toBeEnabled();
    expect(mocks.prepareTransactionImport).not.toHaveBeenCalled();
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue manually' }));
    expect(await screen.findByText('Check the columns Aura should use')).toBeInTheDocument();
  });

  it('returns to a new global proposal when row repair says the confirmed interpretation is wrong', async () => {
    mocks.executeConfirmedImportV2Interpretation.mockResolvedValue({
      status: 'unresolved', validation, sourceRowNumbers: [3],
    });
    mocks.repairUnresolvedImportV2RowsWithHarnex.mockResolvedValue({
      status: 'global-plan-wrong',
      validation,
      sourceRowNumbers: [3],
      repairedSourceRowNumbers: [],
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose raw file' }));
    await screen.findByText('Check what Harnex understood');
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is correct' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('needs a broader revision');
    expect(mocks.prepareTransactionImport).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Something is wrong' })).toBeEnabled();
  });

  it('discards a stale confirmed full-file result after the import session closes', async () => {
    let resolveExecution: ((value: { status: 'resolved'; validation: StructuredImportValidationResult }) => void) | undefined;
    mocks.executeConfirmedImportV2Interpretation.mockReturnValue(new Promise((resolve) => {
      resolveExecution = resolve;
    }));
    const onClose = vi.fn();
    render(<ImportWizardDialog isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose raw file' }));
    await screen.findByText('Check what Harnex understood');

    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is correct' }));
    expect(await screen.findByRole('button', { name: 'Checking whole file…' })).toBeDisabled();
    await waitFor(() => expect(mocks.executeConfirmedImportV2Interpretation).toHaveBeenCalledOnce());

    fireEvent.click(screen.getAllByRole('button', { name: 'Close import wizard' }).at(-1)!);
    expect(onClose).toHaveBeenCalledTimes(1);
    resolveExecution?.({ status: 'resolved', validation });

    expect(await screen.findByRole('button', { name: 'Choose raw file' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.prepareTransactionImport).not.toHaveBeenCalled());
    expect(mocks.resolveImportV2Categories).not.toHaveBeenCalled();
    expect(mocks.commitPreparedTransactionImport).not.toHaveBeenCalled();
  });

  it('preserves manual recovery when Harnex is unavailable during raw interpretation', async () => {
    mocks.inferImportV2PlanWithHarnex.mockResolvedValue({
      status: 'assistance-unavailable',
      failure: { code: 'UNAUTHORIZED', message: 'Not authorized.' },
    });
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose raw file' }));

    expect(await screen.findByText('Continue without assistance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue manually' }));
    expect(await screen.findByText('Check the columns Aura should use')).toBeInTheDocument();
    expect(mocks.executeConfirmedImportV2Interpretation).not.toHaveBeenCalled();
  });
});
