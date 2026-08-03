import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { useApp } from './context/AppContext';

import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';

// Components
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrandMark } from './components/BrandMark';
import { PlatformRuntimeBridge } from './platform/PlatformRuntimeBridge';
import { PaymentDetectionProvider } from './state/PaymentDetectionProvider';

const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then(({ HistoryPage }) => ({ default: HistoryPage })),
);
const AddTransaction = lazy(() =>
  import('./pages/AddTransaction').then(({ AddTransaction }) => ({ default: AddTransaction })),
);
const BudgetsPage = lazy(() =>
  import('./pages/BudgetsPage').then(({ BudgetsPage }) => ({ default: BudgetsPage })),
);
const RecurringPage = lazy(() =>
  import('./pages/RecurringPage').then(({ RecurringPage }) => ({ default: RecurringPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then(({ ProfilePage }) => ({ default: ProfilePage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage })),
);
const DataPrivacyPage = lazy(() =>
  import('./pages/DataPrivacyPage').then(({ DataPrivacyPage }) => ({ default: DataPrivacyPage })),
);
const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then(({ CalendarPage }) => ({ default: CalendarPage })),
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then(({ AdminPage }) => ({ default: AdminPage })),
);
const MorePage = lazy(() =>
  import('./pages/MorePage').then(({ MorePage }) => ({ default: MorePage })),
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then(({ ReportsPage }) => ({ default: ReportsPage })),
);
const PaymentDetectionPage = lazy(() =>
  import('./pages/PaymentDetectionPage').then(({ PaymentDetectionPage }) => ({ default: PaymentDetectionPage })),
);

function RouteLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center gap-3 text-sm font-semibold text-on-surface-variant"
      role="status"
      aria-live="polite"
    >
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden="true"
      />
      Loading page…
    </div>
  );
}

function RoutePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Layout title={title}>
      <ErrorBoundary>
        <Suspense fallback={<RouteLoading />}>
          {children}
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  const {
    isLoggedIn,
    authLoading,
    authError,
    signInWithGoogle,
    isAdmin,
    isHydrated,
    transactions,
    categories,
    createTransactionVerified,
  } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <BrandMark wordmark={false} iconClassName="h-16 w-16 shadow-xl shadow-primary/15" />
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <Router>
        <PaymentDetectionProvider
          active={isLoggedIn}
          appDataHydrated={isHydrated}
          transactions={transactions}
          categories={categories}
          createTransactionVerified={createTransactionVerified}
        >
          <PlatformRuntimeBridge isLoggedIn={isLoggedIn} />
          {!isLoggedIn ? (
            <Login onSignIn={signInWithGoogle} error={authError} />
          ) : (
            <Routes>
              <Route path="/" element={<RoutePage title="Dashboard"><Dashboard /></RoutePage>} />
              <Route path="/transactions" element={<RoutePage title="Transactions"><HistoryPage /></RoutePage>} />
              <Route path="/history" element={<RoutePage title="Transactions"><HistoryPage /></RoutePage>} />
              <Route path="/add" element={<RoutePage title="Add Transaction"><AddTransaction /></RoutePage>} />
              <Route path="/edit/:id" element={<RoutePage title="Edit Transaction"><AddTransaction /></RoutePage>} />
              <Route path="/budgets" element={<RoutePage title="Budgets"><BudgetsPage /></RoutePage>} />
              <Route path="/recurring" element={<RoutePage title="Planning"><RecurringPage /></RoutePage>} />
              <Route path="/profile" element={<RoutePage title="Profile"><ProfilePage /></RoutePage>} />
              <Route path="/settings" element={<RoutePage title="Settings"><SettingsPage /></RoutePage>} />
              <Route path="/data" element={<RoutePage title="Data & Privacy"><DataPrivacyPage /></RoutePage>} />
              <Route path="/payment-detection" element={<RoutePage title="Payments to review"><PaymentDetectionPage /></RoutePage>} />
              <Route path="/calendar" element={<RoutePage title="Planning"><CalendarPage /></RoutePage>} />
              <Route path="/planning" element={<RoutePage title="Planning"><CalendarPage /></RoutePage>} />
              <Route path="/planning/recurring" element={<RoutePage title="Planning"><RecurringPage /></RoutePage>} />
              <Route path="/reports" element={<RoutePage title="Reports"><ReportsPage view="overview" /></RoutePage>} />
              <Route path="/reports/categories" element={<RoutePage title="Reports"><ReportsPage view="categories" /></RoutePage>} />
              <Route path="/reports/categories/:category" element={<RoutePage title="Category report"><ReportsPage view="categories" /></RoutePage>} />
              <Route path="/reports/compare" element={<RoutePage title="Reports"><ReportsPage view="compare" /></RoutePage>} />
              <Route path="/reports/year" element={<RoutePage title="Reports"><ReportsPage view="year" /></RoutePage>} />
              <Route path="/insights" element={<RoutePage title="Reports"><ReportsPage view="overview" /></RoutePage>} />
              <Route path="/compare" element={<RoutePage title="Reports"><ReportsPage view="compare" /></RoutePage>} />
              <Route path="/year-review" element={<RoutePage title="Reports"><ReportsPage view="year" /></RoutePage>} />
              <Route path="/more" element={<RoutePage title="More"><MorePage /></RoutePage>} />
              {isAdmin && (
                <Route path="/admin" element={<RoutePage title="Admin"><AdminPage /></RoutePage>} />
              )}
            </Routes>
          )}
        </PaymentDetectionProvider>
      </Router>
    </MotionConfig>
  );
}
