import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useApp } from './context/AppContext';

// Lazy-loaded pages — each becomes a separate chunk
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const AddTransaction = lazy(() => import('./pages/AddTransaction').then(m => ({ default: m.AddTransaction })));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage').then(m => ({ default: m.BudgetsPage })));
const RecurringPage = lazy(() => import('./pages/RecurringPage').then(m => ({ default: m.RecurringPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const InsightsPage = lazy(() => import('./pages/InsightsPage').then(m => ({ default: m.InsightsPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));

// Components
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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
        <Suspense fallback={<PageLoader />}>
          <Login onSignIn={signInWithGoogle} error={authError} />
        </Suspense>
      ) : (
        <Suspense fallback={<Layout title=""><PageLoader /></Layout>}>
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
        </Suspense>
      )}
    </Router>
  );
}
