import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    accounts: [],
    transactions: [],
    setTransactions: vi.fn(),
    budgets: [],
    setBudgets: vi.fn(),
    recurring: [],
    setRecurring: vi.fn(),
    categories: ['Housing'],
    setCategories: vi.fn(),
    archivedCategories: [],
    setArchivedCategories: vi.fn(),
    savingsGoals: [],
    setSavingsGoals: vi.fn(),
    monthlyBudget: 5_000,
    setMonthlyBudget: vi.fn(),
    allTimeTotals: { income: 0, expenses: 0, net: 0 },
    currentBalance: 0,
    user: null,
    signOut: vi.fn(),
    isAdmin: false,
    cloudBackupEnabled: false,
    setCloudBackupEnabled: vi.fn(),
    backupStatus: 'idle',
    lastBackupDate: null,
    backupVersions: [],
    backupVersionsLoading: false,
    refreshBackupVersions: vi.fn(),
    restoreFromCloud: vi.fn(),
    deleteCloudBackup: vi.fn(),
    pushBackupNow: vi.fn(),
    resetAll: vi.fn(),
  }),
}));

vi.mock('../../components/Toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('../../components/archive/ExportArchiveDialog', () => ({
  ExportArchiveDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Complete export dialog open</div> : null,
}));
vi.mock('../../components/archive/ImportArchiveDialog', () => ({
  ImportArchiveDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Complete import dialog open</div> : null,
}));
vi.mock('../../services/archive/archiveDownload', () => ({ downloadBlob: mocks.downloadBlob }));

import { DataPrivacyPage } from '../DataPrivacyPage';

describe('Data & Privacy archive actions', () => {
  it('keeps complete archive actions distinct from the transaction-only CSV workflow', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><DataPrivacyPage /></MemoryRouter>);

    expect(screen.getByText(/CSV is for analysis or moving transaction rows/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Export complete archive/i }));
    expect(screen.getByText('Complete export dialog open')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Import Aura archive/i }));
    expect(screen.getByText('Complete import dialog open')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Export transactions CSV/i }));
    await waitFor(() => {
      expect(mocks.downloadBlob).toHaveBeenCalledOnce();
      expect(mocks.downloadBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/^aura_transactions_.*\.csv$/),
      );
    });
  });
});
