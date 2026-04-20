import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useLocalStorage } from './hooks/useLocalStorage';
import { User } from './types';

// Pages
import { Dashboard } from './pages/Dashboard';
import { HistoryPage } from './pages/HistoryPage';
import { AddTransaction } from './pages/AddTransaction';
import { BudgetsPage } from './pages/BudgetsPage';
import { RecurringPage } from './pages/RecurringPage';
import { ProfilePage } from './pages/ProfilePage';
import { Login } from './pages/Login';

// Components
import { Layout } from './components/Layout';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useLocalStorage('aura_logged_in', false);
  const [user, setUser] = useLocalStorage<User | null>('aura_user', null);

  if (!isLoggedIn) {
    return (
      <Login 
        onLogin={(fakeUser) => {
          setUser(fakeUser);
          setIsLoggedIn(true);
        }} 
      />
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout title="Dashboard"><Dashboard /></Layout>} />
        <Route path="/history" element={<Layout title="History"><HistoryPage /></Layout>} />
        <Route path="/add" element={<Layout title="Add Transaction"><AddTransaction /></Layout>} />
        <Route path="/edit/:id" element={<Layout title="Edit Transaction"><AddTransaction /></Layout>} />
        <Route path="/budgets" element={<Layout title="Budgets"><BudgetsPage /></Layout>} />
        <Route path="/recurring" element={<Layout title="Recurring"><RecurringPage /></Layout>} />
        <Route path="/profile" element={<Layout title="Profile"><ProfilePage /></Layout>} />
      </Routes>
    </Router>
  );
}
