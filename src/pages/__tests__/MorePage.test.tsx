import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MorePage } from '../MorePage';

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    isAdmin: false,
    cloudBackupEnabled: false,
    backupStatus: 'idle',
  }),
}));

vi.mock('../../components/PwaInstallButton', () => ({ PwaInstallButton: () => null }));

describe('MorePage navigation', () => {
  it('contains dedicated tools and settings navigation items', () => {
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Open Planning' })).toHaveAttribute('href', '/planning');
    expect(screen.getByRole('link', { name: 'Open Data & privacy' })).toHaveAttribute('href', '/data');
    expect(screen.getByRole('link', { name: 'Open Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.queryByText('Budgets')).not.toBeInTheDocument();
    expect(screen.queryByText('Year in Review')).not.toBeInTheDocument();
    expect(screen.getByText('Private by design')).toBeInTheDocument();
    expect(screen.getByText('Local-first data and secure optional backup')).toBeInTheDocument();
  });
});
