import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MorePage } from '../MorePage';

const setIsDarkMode = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    isAdmin: false,
    cloudBackupEnabled: false,
    backupStatus: 'idle',
    isDarkMode: false,
    setIsDarkMode,
  }),
}));

vi.mock('../../components/PwaInstallButton', () => ({ PwaInstallButton: () => null }));

describe('MorePage appearance settings', () => {
  it('exposes the persisted dark-mode preference', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>,
    );

    const control = screen.getByRole('switch', { name: 'Toggle dark mode' });
    expect(control).toHaveAttribute('aria-checked', 'false');

    await user.click(control);
    expect(setIsDarkMode).toHaveBeenCalledWith(true);
  });

  it('contains only occasional tools and hides irrelevant install guidance', () => {
    render(<MemoryRouter><MorePage /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Open Planning' })).toHaveAttribute('href', '/planning');
    expect(screen.getByRole('link', { name: 'Open Import & export' })).toHaveAttribute('href', '/profile#data-management');
    expect(screen.getByRole('link', { name: 'Open Privacy & backup' })).toHaveAttribute('href', '/profile#privacy-backup');
    expect(screen.getByRole('link', { name: 'Open Settings' })).toHaveAttribute('href', '/profile#settings');
    expect(screen.queryByText('Budgets')).not.toBeInTheDocument();
    expect(screen.queryByText('Year in Review')).not.toBeInTheDocument();
    expect(screen.queryByText('Install Aura')).not.toBeInTheDocument();
    expect(screen.getByText('Stored locally; cloud backup is off')).toBeInTheDocument();
  });
});
