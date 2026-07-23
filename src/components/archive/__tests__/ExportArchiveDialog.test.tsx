import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TEST_APP_DATA } from '../../../domain/archive/__tests__/fixtures';

const mocks = vi.hoisted(() => ({
  buildPortableArchive: vi.fn(),
  downloadPortableArchive: vi.fn(),
}));

vi.mock('../../../services/archive/archiveSnapshotService', () => ({
  archiveSnapshotService: {
    collect: async (data: typeof TEST_APP_DATA) => ({
      data,
      preferences: {
        notificationPreferences: {
          enabled: false,
          budgetAlerts: true,
          recurringReminders: true,
          customReminders: true,
          reminderLeadDays: 1,
        },
        customReminders: [],
        appearance: { darkMode: false },
      },
      attachments: [],
      warnings: [],
    }),
  },
}));

vi.mock('../../../services/archive/archiveBuilder', () => ({
  buildPortableArchive: mocks.buildPortableArchive,
}));

vi.mock('../../../services/archive/archiveDownload', () => ({
  downloadPortableArchive: mocks.downloadPortableArchive,
}));

import { ExportArchiveDialog } from '../ExportArchiveDialog';

describe('ExportArchiveDialog', () => {
  it('defaults to encryption and downloads only after builder verification', async () => {
    const user = userEvent.setup();
    const archive = {
      blob: new Blob(['verified']),
      filename: 'aura-backup-2026-07-22.aura',
      manifest: { archiveId: 'archive-test' },
      encrypted: true,
      byteLength: 8,
    };
    mocks.buildPortableArchive.mockImplementation(async (_data, options) => {
      options.onProgress?.('self-verifying');
      options.onProgress?.('complete');
      return archive;
    });
    render(<ExportArchiveDialog isOpen data={TEST_APP_DATA} onClose={vi.fn()} />);

    const exportButton = screen.getByRole('button', { name: /Create and download archive/i });
    await screen.findByText('Transactions');
    expect(screen.getByRole('radio', { name: /Passphrase protected/i })).toBeChecked();
    expect(exportButton).toBeDisabled();

    await user.type(screen.getByLabelText('Passphrase'), 'secure archive phrase');
    await user.type(screen.getByLabelText('Confirm passphrase'), 'secure archive phrase');
    await user.click(exportButton);

    expect(mocks.buildPortableArchive).toHaveBeenCalledWith(TEST_APP_DATA, expect.objectContaining({
      passphrase: 'secure archive phrase',
    }));
    expect(mocks.downloadPortableArchive).toHaveBeenCalledWith(archive);
    expect(await screen.findByText('Archive verified and downloaded.')).toBeInTheDocument();
  });

  it('requires an explicit readable-data warning acknowledgement for plaintext export', async () => {
    const user = userEvent.setup();
    render(<ExportArchiveDialog isOpen data={TEST_APP_DATA} onClose={vi.fn()} />);

    await screen.findByText('Transactions');
    await user.click(screen.getByRole('radio', { name: /No encryption/i }));
    const exportButton = screen.getByRole('button', { name: /Create and download archive/i });
    expect(exportButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /readable financial data/i }));
    expect(exportButton).toBeEnabled();
  });
});
