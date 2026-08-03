import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createImportIssue } from '../../../domain/import';
import { FileUploadStep } from '../FileUploadStep';

describe('FileUploadStep', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('explains local processing and accepts a supported file without AI consent', () => {
    const onFileSelected = vi.fn();
    render(<FileUploadStep onFileSelected={onFileSelected} isProcessing={false} />);

    expect(screen.getByText('Processed only on this device')).toBeInTheDocument();
    expect(screen.getByText(/fixed columns/)).toBeInTheDocument();
    expect(screen.queryByText(/Gemini|Google|AI/i)).not.toBeInTheDocument();

    const file = new File(['date,description,amount'], 'transactions.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Choose transaction file'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate file' }));
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it('shows safe validation issues and lets the user choose a corrected file', () => {
    render(
      <FileUploadStep
        onFileSelected={vi.fn()}
        isProcessing={false}
        validationIssues={[
          createImportIssue('date_invalid', 'error', { rowNumber: 4, column: 'date' }),
        ]}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Row 4, date: Use a real calendar date.');
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeEnabled();
  });

  it('downloads local CSV and XLSX templates', async () => {
    render(<FileUploadStep onFileSelected={vi.fn()} isProcessing={false} />);
    fireEvent.click(screen.getByRole('button', { name: /CSV template/ }));
    fireEvent.click(screen.getByRole('button', { name: /XLSX template/ }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2));
  });
});

