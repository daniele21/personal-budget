import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const appState = vi.hoisted(() => ({ isLoggedIn: true }));

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    isLoggedIn: appState.isLoggedIn,
    authLoading: false,
    authError: null,
    signInWithGoogle: vi.fn(),
    isAdmin: false,
    isHydrated: true,
    transactions: [],
    categories: ['Groceries'],
    createTransactionVerified: vi.fn(),
  }),
}));

vi.mock('../state/PaymentDetectionProvider', () => ({
  PaymentDetectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
vi.mock('../pages/PaymentDetectionPage', () => ({
  PaymentDetectionPage: () => <div>Payments to review page</div>,
}));

function renderRoute(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  appState.isLoggedIn = true;
  window.history.pushState({}, '', '/');
});

describe('canonical application routes', () => {
  it('keeps the account-deletion route public without an active session', async () => {
    appState.isLoggedIn = false;
    renderRoute('/account-deletion');
    expect(await screen.findByText('Delete your Aura account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in to continue' })).toBeInTheDocument();
  });

  it('renders the canonical Reports route', async () => {
    renderRoute('/reports');
    expect(await screen.findByText('Reports overview page')).toBeInTheDocument();
  });

  it('renders the canonical Planning route', async () => {
    renderRoute('/planning');
    expect(await screen.findByText('Planning page')).toBeInTheDocument();
  });

  it('renders the Android payment review queue route', async () => {
    renderRoute('/payment-detection');
    expect(await screen.findByText('Payments to review page')).toBeInTheDocument();
  });

  it('renders the canonical recurring Planning view and preserves its legacy alias', async () => {
    const { unmount } = renderRoute('/planning/recurring');
    expect(await screen.findByText('Recurring page')).toBeInTheDocument();
    unmount();

    renderRoute('/recurring');
    expect(await screen.findByText('Recurring page')).toBeInTheDocument();
  });

  it('preserves legacy report and transaction aliases', async () => {
    const { unmount } = renderRoute('/insights');
    expect(await screen.findByText('Reports overview page')).toBeInTheDocument();
    unmount();

    renderRoute('/history');
    expect(await screen.findByText('Transactions page')).toBeInTheDocument();
  });

  it('routes canonical report views and legacy aliases to the matching content', async () => {
    const { unmount } = renderRoute('/reports/categories');
    expect(await screen.findByText('Reports categories page')).toBeInTheDocument();
    unmount();

    renderRoute('/compare');
    expect(await screen.findByText('Reports compare page')).toBeInTheDocument();
  });

  it('routes category report drill-downs through the shared Reports surface', async () => {
    renderRoute('/reports/categories/Food?range=3M&lens=actual');
    expect(await screen.findByText('Reports categories page')).toBeInTheDocument();
  });
});
