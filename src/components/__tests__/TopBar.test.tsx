import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../types';
import { TopBar } from '../TopBar';

const appMocks = vi.hoisted(() => ({ user: null as User | null }));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ user: appMocks.user }),
}));

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
}));

vi.mock('../GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../NotificationCenter', () => ({ NotificationCenter: () => null }));
vi.mock('../../state/PaymentDetectionProvider', () => ({
  usePaymentDetection: () => ({ candidates: [] }),
}));
function renderTopBar(path: string, title: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopBar title={title} />
    </MemoryRouter>,
  );
}

describe('TopBar route variants', () => {
  beforeEach(() => {
    appMocks.user = null;
  });

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
    expect(screen.queryByRole('button', { name: 'Install Aura' })).not.toBeInTheDocument();
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

  it('uses an accessible initial instead of rendering an empty avatar source', () => {
    appMocks.user = {
      id: 'user-1',
      name: 'Aura User',
      email: 'aura@example.com',
      photoUrl: '',
    };

    const { container } = renderTopBar('/', 'Dashboard');

    expect(screen.getByRole('img', { name: 'Aura User' })).toHaveTextContent('A');
    expect(container.querySelector('img[src=""]')).not.toBeInTheDocument();
  });
});
