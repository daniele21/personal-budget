import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DataPrivacyPage } from '../DataPrivacyPage';

const mocks = vi.hoisted(() => ({
  setCloudBackupEnabled: vi.fn(),
  refreshBackupVersions: vi.fn(),
  restoreFromCloud: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    accounts: [],
    transactions: [],
    budgets: [],
    recurring: [],
    categories: [],
    archivedCategories: [],
    savingsGoals: [],
    monthlyBudget: 5000,
    cloudBackupEnabled: false,
    setCloudBackupEnabled: mocks.setCloudBackupEnabled,
    backupStatus: 'idle',
    lastBackupDate: null,
    backupVersions: [
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
    ],
    backupVersionsLoading: false,
    refreshBackupVersions: mocks.refreshBackupVersions,
    restoreFromCloud: mocks.restoreFromCloud,
    deleteCloudBackup: vi.fn(),
    pushBackupNow: vi.fn(),
    resetAll: vi.fn(),
  }),
}));

vi.mock('../../components/Toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

describe('DataPrivacyPage', () => {
  it('renders data management and privacy sections', () => {
    render(
      <MemoryRouter>
        <DataPrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
    expect(screen.getByText('Portable Archive')).toBeInTheDocument();
    expect(screen.getByText('Interoperability')).toBeInTheDocument();
    expect(screen.getByText('Cloud Sync & Backup')).toBeInTheDocument();
    expect(screen.getByText('Your data stays on this device')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('toggles cloud backup', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DataPrivacyPage />
      </MemoryRouter>,
    );

    const switchBtn = screen.getByRole('switch', { name: 'Attiva backup cloud' });
    await user.click(switchBtn);
    expect(mocks.setCloudBackupEnabled).toHaveBeenCalledWith(true);
  });

  it('lets the user select and restore one of the three cloud backup versions', async () => {
    mocks.restoreFromCloud.mockResolvedValueOnce(true);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DataPrivacyPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Ripristina backup cloud/i }));
    expect(mocks.refreshBackupVersions).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('radio', { name: /Backup precedente 1/i }));
    await user.click(screen.getByRole('button', { name: /Ripristina la versione selezionata/i }));
    await user.click(screen.getByRole('button', { name: 'Conferma' }));

    expect(mocks.restoreFromCloud).toHaveBeenCalledWith('previous');
    expect(mocks.toast).toHaveBeenCalledWith('Backup ripristinato sul dispositivo', 'success');
  });
});
