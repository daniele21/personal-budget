import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.queryByText('Private by design')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Data & privacy/i })).toHaveLength(1);
  });

  it('keeps the tour catalog collapsed by default and expands it on request', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MorePage />
      </MemoryRouter>,
    );

    const disclosure = screen.getByRole('button', { name: /help & tours/i });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Start Home essentials tour' }))
      .not.toBeInTheDocument();

    await user.click(disclosure);

    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Start Home essentials tour' }))
      .toBeInTheDocument();
  });
});
