import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InitialDataDialog } from '../InitialDataDialog';

const versions = [
  {
    id: 'latest',
    createdAt: '2026-07-23T12:00:00.000Z',
    isLatest: true,
    position: 0,
  },
  {
    id: 'previous',
    createdAt: '2026-07-22T12:00:00.000Z',
    isLatest: false,
    position: 1,
  },
  {
    id: 'oldest',
    createdAt: '2026-07-21T12:00:00.000Z',
    isLatest: false,
    position: 2,
  },
];

describe('InitialDataDialog cloud restore', () => {
  it('preselects the latest backup and restores the exact chosen version', async () => {
    const onRestoreBackup = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(
      <InitialDataDialog
        isOpen
        backupAvailable
        backupVersions={versions}
        onRestoreBackup={onRestoreBackup}
        onStartBlank={vi.fn()}
        onUseDemoData={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: /Latest backup/i })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: /Previous backup 2/i }));
    await user.click(screen.getByRole('button', { name: /Restore selected backup/i }));

    expect(onRestoreBackup).toHaveBeenCalledWith('oldest');
  });
});
