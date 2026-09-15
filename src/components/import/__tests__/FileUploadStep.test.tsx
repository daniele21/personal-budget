import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createImportIssue } from '../../../domain/import';
import { FileUploadStep } from '../FileUploadStep';

const mocks = vi.hoisted(() => ({
  getPlatformCapabilities: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  openHostApp: vi.fn(),
}));

vi.mock('../../../platform/platformCapabilities', () => ({
  getPlatformCapabilities: mocks.getPlatformCapabilities,
}));

vi.mock('../../../platform/harnex', () => ({
  harnexClient: {
    connect: mocks.connect,
    disconnect: mocks.disconnect,
  },
  openHarnexHostApp: mocks.openHostApp,
}));

describe('FileUploadStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatformCapabilities.mockReturnValue({ harnexSupported: false });
    mocks.connect.mockResolvedValue({ status: 'connected' });
    mocks.disconnect.mockResolvedValue({ status: 'disconnected' });
    mocks.openHostApp.mockResolvedValue({ status: 'opened' });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('explains local processing and accepts a supported file without AI consent', () => {
    const onFileSelected = vi.fn();
    render(<FileUploadStep onFileSelected={onFileSelected} isProcessing={false} />);

    expect(screen.getByText('Processed only on this device')).toBeInTheDocument();
    expect(screen.getByText(/common or custom column names/)).toBeInTheDocument();
    expect(screen.queryByText(/\b(?:Gemini|Google|AI)\b/i)).not.toBeInTheDocument();

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

  it('shows authorized Harnex readiness without activating a use case', async () => {
    mocks.getPlatformCapabilities.mockReturnValue({ harnexSupported: true });
    mocks.connect.mockResolvedValue({ status: 'connected' });

    render(<FileUploadStep onFileSelected={vi.fn()} isProcessing={false} />);

    expect(await screen.findByText('Harnex assistance ready')).toBeInTheDocument();
    expect(screen.getByText(/File structure and Harnex connection are separate checks/)).toBeInTheDocument();
    expect(mocks.connect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.disconnect).toHaveBeenCalledTimes(1));
  });

  it('explains authorization recovery and opens Harnex', async () => {
    mocks.getPlatformCapabilities.mockReturnValue({ harnexSupported: true });
    mocks.connect.mockResolvedValue({
      status: 'unavailable',
      failure: { code: 'UNAUTHORIZED', message: 'Caller is not authorized.' },
    });

    render(<FileUploadStep onFileSelected={vi.fn()} isProcessing={false} />);

    expect(await screen.findByText('Harnex approval required')).toBeInTheDocument();
    expect(screen.getByText(/exact app identity/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Harnex' }));
    await waitFor(() => expect(mocks.openHostApp).toHaveBeenCalledTimes(1));
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });

  it('refreshes readiness after returning from Harnex', async () => {
    mocks.getPlatformCapabilities.mockReturnValue({ harnexSupported: true });
    mocks.connect
      .mockResolvedValueOnce({
        status: 'unavailable',
        failure: { code: 'UNAUTHORIZED', message: 'Caller is not authorized.' },
      })
      .mockResolvedValue({ status: 'connected' });

    render(<FileUploadStep onFileSelected={vi.fn()} isProcessing={false} />);

    expect(await screen.findByText('Harnex approval required')).toBeInTheDocument();
    fireEvent.focus(window);
    expect(await screen.findByText('Harnex assistance ready')).toBeInTheDocument();
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });
});
