import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionPage } from '../AccountDeletionPage';

const mocks = vi.hoisted(() => ({
  state: { isLoggedIn: false },
  signInWithGoogle: vi.fn(async () => undefined),
  deleteCloudBackup: vi.fn(async () => true),
  reauthenticate: vi.fn(async () => undefined),
  deleteAuthIdentity: vi.fn(async () => undefined),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    isLoggedIn: mocks.state.isLoggedIn,
    signInWithGoogle: mocks.signInWithGoogle,
    deleteCloudBackup: mocks.deleteCloudBackup,
    reauthenticateForAccountDeletion: mocks.reauthenticate,
    deleteAuthIdentity: mocks.deleteAuthIdentity,
  }),
}));

vi.mock('../../platform/nativeDataLifecycle', () => ({
  purgeNativePaymentData: vi.fn(async () => undefined),
}));

vi.mock('../../services/account-deletion/localAccountDataService', () => ({
  deleteManagedLocalAccountData: vi.fn(async () => undefined),
}));

describe('AccountDeletionPage', () => {
  beforeEach(() => {
    mocks.state.isLoggedIn = false;
    vi.clearAllMocks();
  });

  it('provides a public sign-in path when there is no active session', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AccountDeletionPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Delete your Aura account' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in to continue' }));
    expect(mocks.signInWithGoogle).toHaveBeenCalledOnce();
  });

  it('requires exact typed confirmation and reports verified completion', async () => {
    mocks.state.isLoggedIn = true;
    const user = userEvent.setup();
    render(<MemoryRouter><AccountDeletionPage /></MemoryRouter>);

    const button = screen.getByRole('button', { name: 'Permanently delete account' });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    expect(button).toBeEnabled();
    await user.click(button);

    expect(await screen.findByRole('heading', { name: 'Aura account deleted' })).toBeInTheDocument();
    expect(mocks.reauthenticate).toHaveBeenCalledOnce();
    expect(mocks.deleteCloudBackup).toHaveBeenCalledOnce();
    expect(mocks.deleteAuthIdentity).toHaveBeenCalledOnce();
  });
});
