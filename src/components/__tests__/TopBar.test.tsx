import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from '../TopBar';

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ user: null }),
}));

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
}));

vi.mock('../GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../NotificationCenter', () => ({ NotificationCenter: () => null }));
vi.mock('../PwaInstallButton', () => ({
  PwaInstallButton: ({ variant }: { variant: string }) => (
    <button type="button" aria-label="Installa Aura" data-variant={variant} />
  ),
}));

function renderTopBar(path: string, title: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopBar title={title} />
    </MemoryRouter>,
  );
}

describe('TopBar route variants', () => {
  it('leaves search to the local Transactions surface', () => {
    renderTopBar('/transactions', 'Transactions');

    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute('href', '/more');
  });

  it('does not expose a non-functional Reports menu', () => {
    renderTopBar('/reports', 'Reports');

    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More options' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute('href', '/more');
    expect(screen.getByRole('button', { name: 'Installa Aura' })).toHaveAttribute('data-variant', 'icon');
  });

  it.each([
    ['/', 'Dashboard'],
    ['/budgets', 'Budgets'],
    ['/planning', 'Planning'],
    ['/more', 'More'],
  ])('keeps the global More entry in the header at %s', (path, title) => {
    renderTopBar(path, title);

    const moreLink = screen.getByRole('link', { name: 'More' });
    expect(moreLink).toHaveAttribute('href', '/more');
    if (path === '/more') expect(moreLink).toHaveAttribute('aria-current', 'page');
  });
});
