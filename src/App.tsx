import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { useApp } from './context/AppContext';

import { Dashboard } from './pages/Dashboard';
import { HistoryPage } from './pages/HistoryPage';
import { AddTransaction } from './pages/AddTransaction';
import { BudgetsPage } from './pages/BudgetsPage';
import { RecurringPage } from './pages/RecurringPage';
import { ProfilePage } from './pages/ProfilePage';
import { CalendarPage } from './pages/CalendarPage';
import { AdminPage } from './pages/AdminPage';
import { Login } from './pages/Login';
import { MorePage } from './pages/MorePage';
import { ReportsPage } from './pages/ReportsPage';

// Components
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrandMark } from './components/BrandMark';

export default function App() {
  const { isLoggedIn, authLoading, authError, signInWithGoogle, isAdmin } = useApp();

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
        {!isLoggedIn ? (
          <Login onSignIn={signInWithGoogle} error={authError} />
        ) : (
          <Routes>
            <Route path="/" element={<Layout title="Dashboard"><ErrorBoundary><Dashboard /></ErrorBoundary></Layout>} />
            <Route path="/transactions" element={<Layout title="Transactions"><ErrorBoundary><HistoryPage /></ErrorBoundary></Layout>} />
            <Route path="/history" element={<Layout title="Transactions"><ErrorBoundary><HistoryPage /></ErrorBoundary></Layout>} />
            <Route path="/add" element={<Layout title="Add Transaction"><ErrorBoundary><AddTransaction /></ErrorBoundary></Layout>} />
            <Route path="/edit/:id" element={<Layout title="Edit Transaction"><ErrorBoundary><AddTransaction /></ErrorBoundary></Layout>} />
            <Route path="/budgets" element={<Layout title="Budgets"><ErrorBoundary><BudgetsPage /></ErrorBoundary></Layout>} />
            <Route path="/recurring" element={<Layout title="Planning"><ErrorBoundary><RecurringPage /></ErrorBoundary></Layout>} />
            <Route path="/profile" element={<Layout title="Profile"><ErrorBoundary><ProfilePage /></ErrorBoundary></Layout>} />
            <Route path="/calendar" element={<Layout title="Planning"><ErrorBoundary><CalendarPage /></ErrorBoundary></Layout>} />
            <Route path="/planning" element={<Layout title="Planning"><ErrorBoundary><CalendarPage /></ErrorBoundary></Layout>} />
            <Route path="/planning/recurring" element={<Layout title="Planning"><ErrorBoundary><RecurringPage /></ErrorBoundary></Layout>} />
            <Route path="/reports" element={<Layout title="Reports"><ErrorBoundary><ReportsPage view="overview" /></ErrorBoundary></Layout>} />
            <Route path="/reports/categories" element={<Layout title="Reports"><ErrorBoundary><ReportsPage view="categories" /></ErrorBoundary></Layout>} />
            <Route path="/reports/compare" element={<Layout title="Reports"><ErrorBoundary><ReportsPage view="compare" /></ErrorBoundary></Layout>} />
            <Route path="/reports/year" element={<Layout title="Reports"><ErrorBoundary><ReportsPage view="year" /></ErrorBoundary></Layout>} />
            <Route path="/insights" element={<Layout title="Reports"><ErrorBoundary><ReportsPage view="overview" /></ErrorBoundary></Layout>} />
            <Route path="/compare" element={<Layout title="Reports"><ErrorBoundary><ReportsPage view="compare" /></ErrorBoundary></Layout>} />
            <Route path="/year-review" element={<Layout title="Reports"><ErrorBoundary><ReportsPage view="year" /></ErrorBoundary></Layout>} />
            <Route path="/more" element={<Layout title="More"><ErrorBoundary><MorePage /></ErrorBoundary></Layout>} />
            {isAdmin && (
              <Route path="/admin" element={<Layout title="Admin"><ErrorBoundary><AdminPage /></ErrorBoundary></Layout>} />
            )}
          </Routes>
        )}
      </Router>
    </MotionConfig>
  );
}
