import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildValidArchivePayload } from '../../../domain/archive/__tests__/fixtures';

const mocks = vi.hoisted(() => ({
  assessCurrentRestoreImpact: vi.fn(),
  restorePreparedArchive: vi.fn(),
  downloadPortableArchive: vi.fn(),
}));

vi.mock('../../../services/archive/restoreService', () => ({
  assessCurrentRestoreImpact: mocks.assessCurrentRestoreImpact,
  restorePreparedArchive: mocks.restorePreparedArchive,
}));

vi.mock('../../../services/archive/archiveDownload', () => ({
  downloadPortableArchive: mocks.downloadPortableArchive,
}));

import { RestoreArchiveConfirmDialog } from '../RestoreArchiveConfirmDialog';

describe('RestoreArchiveConfirmDialog', () => {
  it('requires confirmation and downloads the verified safety copy before completion', async () => {
    const user = userEvent.setup();
    const payload = await buildValidArchivePayload();
    const prepared = {
      data: payload.data,
      preferences: payload.preferences,
      attachments: new Map(payload.attachments.map((attachment) => [attachment.transactionId, attachment])),
      manifest: payload.manifest,
      warnings: [],
    };
    const safetyArchive = {
      blob: new Blob(['safety']),
      filename: 'aura-safety-before-restore-2026-07-22.aura',
      manifest: payload.manifest,
      encrypted: true,
      byteLength: 6,
    };
    mocks.assessCurrentRestoreImpact.mockResolvedValue({
      hasMeaningfulData: true,
      canCreateCompleteSafetyCopy: true,
    });
    mocks.restorePreparedArchive.mockImplementation(async (_prepared, options) => {
      await options.onSafetyArchiveReady(safetyArchive);
      options.onProgress('complete');
      return { restoreId: 'restore-test', safetyCopyCreated: true };
    });
    const onComplete = vi.fn();
    render(
      <RestoreArchiveConfirmDialog
        isOpen
        prepared={prepared}
        archivePassphrase="import archive phrase"
        onCancel={vi.fn()}
        onComplete={onComplete}
      />,
    );

    await screen.findByText('Safety copy required');
    const restoreButton = screen.getByRole('button', { name: /Download safety copy and replace data/i });
    expect(restoreButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /current Aura data and attachments will be replaced/i }));
    await user.click(restoreButton);

    await waitFor(() => expect(mocks.restorePreparedArchive).toHaveBeenCalledWith(prepared, expect.objectContaining({
      confirmReplaceExisting: true,
      safetyCopyPassphrase: 'import archive phrase',
    })));
    expect(mocks.downloadPortableArchive).toHaveBeenCalledWith(safetyArchive);
    expect(onComplete).toHaveBeenCalled();
  });
});
