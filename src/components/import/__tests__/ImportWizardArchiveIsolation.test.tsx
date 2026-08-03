import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readTransactionImportFile: vi.fn().mockResolvedValue({ kind: 'aura-archive' }),
  prepareTransactionImport: vi.fn(),
  addTransactions: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../services/import', () => ({
  readTransactionImportFile: mocks.readTransactionImportFile,
  prepareTransactionImport: mocks.prepareTransactionImport,
}));

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    categories: [],
    transactions: [],
    addCategory: vi.fn(),
    addTransactions: mocks.addTransactions,
  }),
}));

vi.mock('../../Toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

vi.mock('../FileUploadStep', () => ({
  FileUploadStep: ({ onFileSelected, errorMessage }: {
    onFileSelected: (file: File) => void;
    errorMessage?: string | null;
  }) => (
    <div>
      <button type="button" onClick={() => onFileSelected(new File(['AURAARC1'], 'renamed.csv'))}>
        Select renamed archive
      </button>
      {errorMessage && <p>{errorMessage}</p>}
    </div>
  ),
}));

import { ImportWizardDialog } from '../ImportWizardDialog';

describe('ImportWizardDialog archive isolation', () => {
  it('routes an Aura archive away from review and persistence', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select renamed archive' }));

    await waitFor(() => expect(mocks.readTransactionImportFile).toHaveBeenCalled());
    expect(await screen.findByText(/Complete Aura archive detected/)).toBeInTheDocument();
    expect(mocks.prepareTransactionImport).not.toHaveBeenCalled();
    expect(mocks.addTransactions).not.toHaveBeenCalled();
  });
});
