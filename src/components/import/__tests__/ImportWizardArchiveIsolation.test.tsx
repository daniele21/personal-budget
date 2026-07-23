import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseSpreadsheetFile: vi.fn(),
  extractAndCategorizeTransactions: vi.fn(),
  toast: vi.fn(),
  isAuraPortableArchive: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../../domain/excelParser', () => ({
  parseSpreadsheetFile: mocks.parseSpreadsheetFile,
}));

vi.mock('../../../domain/transactionCategorizer', () => ({
  extractAndCategorizeTransactions: mocks.extractAndCategorizeTransactions,
}));

vi.mock('../../../services/archive/archiveReader', () => ({
  isAuraPortableArchive: mocks.isAuraPortableArchive,
}));

vi.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    categories: [],
    addCategory: vi.fn(),
    addTransactions: vi.fn(),
    user: null,
  }),
}));

vi.mock('../../Toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../FileUploadStep', () => ({
  FileUploadStep: ({ onFileSelected }: { onFileSelected: (file: File, force: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onFileSelected(new File(['AURAARC1'], 'renamed.csv'), false)}
    >
      Select renamed archive
    </button>
  ),
}));

import { ImportWizardDialog } from '../ImportWizardDialog';

describe('ImportWizardDialog archive isolation', () => {
  it('does not invoke spreadsheet parsing or Gemini for an Aura archive', async () => {
    render(<ImportWizardDialog isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Select renamed archive' }));

    await waitFor(() => expect(mocks.isAuraPortableArchive).toHaveBeenCalled());
    expect(mocks.parseSpreadsheetFile).not.toHaveBeenCalled();
    expect(mocks.extractAndCategorizeTransactions).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.stringContaining('Complete Aura archive detected'),
      'error',
    );
  });
});
