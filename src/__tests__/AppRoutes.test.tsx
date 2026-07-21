import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    isLoggedIn: true,
    authLoading: false,
    authError: null,
    signInWithGoogle: vi.fn(),
    isAdmin: false,
  }),
}));

vi.mock('../components/Layout', () => ({
  Layout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-layout-title={title}>{children}</div>
  ),
}));

vi.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../pages/Dashboard', () => ({ Dashboard: () => <div>Dashboard page</div> }));
vi.mock('../pages/HistoryPage', () => ({ HistoryPage: () => <div>Transactions page</div> }));
vi.mock('../pages/AddTransaction', () => ({ AddTransaction: () => <div>Add page</div> }));
vi.mock('../pages/BudgetsPage', () => ({ BudgetsPage: () => <div>Budgets page</div> }));
vi.mock('../pages/RecurringPage', () => ({ RecurringPage: () => <div>Recurring page</div> }));
vi.mock('../pages/ProfilePage', () => ({ ProfilePage: () => <div>Profile page</div> }));
vi.mock('../pages/CalendarPage', () => ({ CalendarPage: () => <div>Planning page</div> }));
vi.mock('../pages/AdminPage', () => ({ AdminPage: () => <div>Admin page</div> }));
vi.mock('../pages/Login', () => ({ Login: () => <div>Login page</div> }));
vi.mock('../pages/MorePage', () => ({ MorePage: () => <div>More page</div> }));
vi.mock('../pages/ReportsPage', () => ({
  ReportsPage: ({ view }: { view: string }) => <div>Reports {view} page</div>,
}));

function renderRoute(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('canonical application routes', () => {
  it('renders the canonical Reports route', () => {
    renderRoute('/reports');
    expect(screen.getByText('Reports overview page')).toBeInTheDocument();
  });

  it('renders the canonical Planning route', () => {
    renderRoute('/planning');
    expect(screen.getByText('Planning page')).toBeInTheDocument();
  });

  it('renders the canonical recurring Planning view and preserves its legacy alias', () => {
    const { unmount } = renderRoute('/planning/recurring');
    expect(screen.getByText('Recurring page')).toBeInTheDocument();
    unmount();

    renderRoute('/recurring');
    expect(screen.getByText('Recurring page')).toBeInTheDocument();
  });

  it('preserves legacy report and transaction aliases', () => {
    const { unmount } = renderRoute('/insights');
    expect(screen.getByText('Reports overview page')).toBeInTheDocument();
    unmount();

    renderRoute('/history');
    expect(screen.getByText('Transactions page')).toBeInTheDocument();
  });

  it('routes canonical report views and legacy aliases to the matching content', () => {
    const { unmount } = renderRoute('/reports/categories');
    expect(screen.getByText('Reports categories page')).toBeInTheDocument();
    unmount();

    renderRoute('/compare');
    expect(screen.getByText('Reports compare page')).toBeInTheDocument();
  });
});
