import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useApp } from './context/AppContext';

import { Dashboard } from './pages/Dashboard';
import { HistoryPage } from './pages/HistoryPage';
import { AddTransaction } from './pages/AddTransaction';
import { BudgetsPage } from './pages/BudgetsPage';
import { RecurringPage } from './pages/RecurringPage';
import { ProfilePage } from './pages/ProfilePage';
import { CalendarPage } from './pages/CalendarPage';
import { InsightsPage } from './pages/InsightsPage';
import { AdminPage } from './pages/AdminPage';
import { Login } from './pages/Login';

// Components
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const { isLoggedIn, authLoading, authError, signInWithGoogle, isAdmin } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl">
            <img src="/logo.png" alt="Aura Finance" className="w-full h-full object-cover" />
          </div>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Router>
      {!isLoggedIn ? (
        <Login onSignIn={signInWithGoogle} error={authError} />
      ) : (
        <Routes>
          <Route path="/" element={<Layout title="Dashboard"><ErrorBoundary><Dashboard /></ErrorBoundary></Layout>} />
          <Route path="/history" element={<Layout title="History"><ErrorBoundary><HistoryPage /></ErrorBoundary></Layout>} />
          <Route path="/add" element={<Layout title="Add Transaction"><ErrorBoundary><AddTransaction /></ErrorBoundary></Layout>} />
          <Route path="/edit/:id" element={<Layout title="Edit Transaction"><ErrorBoundary><AddTransaction /></ErrorBoundary></Layout>} />
          <Route path="/budgets" element={<Layout title="Budgets"><ErrorBoundary><BudgetsPage /></ErrorBoundary></Layout>} />
          <Route path="/recurring" element={<Layout title="Recurring"><ErrorBoundary><RecurringPage /></ErrorBoundary></Layout>} />
          <Route path="/profile" element={<Layout title="Profile"><ErrorBoundary><ProfilePage /></ErrorBoundary></Layout>} />
          <Route path="/calendar" element={<Layout title="Calendar"><ErrorBoundary><CalendarPage /></ErrorBoundary></Layout>} />
          <Route path="/insights" element={<Layout title="Reports"><ErrorBoundary><InsightsPage /></ErrorBoundary></Layout>} />
          {isAdmin && (
            <Route path="/admin" element={<Layout title="Admin"><ErrorBoundary><AdminPage /></ErrorBoundary></Layout>} />
          )}
        </Routes>
      )}
    </Router>
  );
}
