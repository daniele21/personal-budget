/**
 * AppContext — centralized state management.
 *
 * Single source of truth for all app data. Pages and components
 * consume this context instead of reading localStorage directly.
 *
 * Responsibilities:
 * - Holds all persisted state (transactions, budgets, recurring, settings)
 * - Provides typed setters
 * - Syncs to localStorage on every change
 * - Exposes derived/computed values via the domain layer
 */
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { STORAGE_KEYS } from '../data/storageKeys';
import { APP_CONFIG, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_RECURRING, INITIAL_ACCOUNTS, INITIAL_CATEGORIES } from '../constants';
import { Transaction, Budget, RecurringExpense, Account, User } from '../types';
import * as Finance from '../domain/finance';

// ─── Context Shape ──────────────────────────────────────────────────

interface AppState {
  // Raw data
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringExpense[];
  accounts: Account[];
  categories: string[];
  monthlyBudget: number;
  user: User | null;
  isLoggedIn: boolean;
  isDarkMode: boolean;
  authLoading: boolean;
  authError: string | null;

  // Setters
  setTransactions: (txs: Transaction[]) => void;
  setBudgets: (budgets: Budget[]) => void;
  setRecurring: (recurring: RecurringExpense[]) => void;
  setAccounts: (accounts: Account[]) => void;
  setCategories: (categories: string[]) => void;
  setMonthlyBudget: (budget: number) => void;
  setUser: (user: User | null) => void;
  setIsLoggedIn: (v: boolean) => void;
  setIsDarkMode: (v: boolean) => void;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Actions
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (budget: Budget) => void;
  deleteBudget: (category: string) => void;
  addRecurring: (bill: RecurringExpense) => void;
  updateRecurring: (id: string, bill: RecurringExpense) => void;
  deleteRecurring: (id: string) => void;
  addCategory: (name: string) => void;
  resetAll: () => void;

  // Derived (computed from domain layer)
  monthlyTransactions: Transaction[];
  monthlyTotals: Finance.TransactionTotals;
  allTimeTotals: Finance.TransactionTotals;
  safeToSpend: { remaining: number; usedPercent: number };
  budgetStatuses: Finance.BudgetStatus[];
  categorySpending: Finance.CategorySpending[];
  momChange: number | null;
  recentTransactions: Transaction[];
  currentBalance: number;
}

const AppContext = createContext<AppState | null>(null);

// ─── Provider ───────────────────────────────────────────────────────

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Firebase auth
  const { user, loading: authLoading, error: authError, signInWithGoogle, signOut } = useFirebaseAuth();
  const isLoggedIn = user !== null;

  // Persisted state
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>(STORAGE_KEYS.budgets, INITIAL_BUDGETS);
  const [recurring, setRecurring] = useLocalStorage<RecurringExpense[]>(STORAGE_KEYS.recurring, INITIAL_RECURRING);
  const [accounts, setAccounts] = useLocalStorage<Account[]>(STORAGE_KEYS.accounts, INITIAL_ACCOUNTS);
  const [categories, setCategories] = useLocalStorage<string[]>(STORAGE_KEYS.categories, INITIAL_CATEGORIES);
  const [monthlyBudget, setMonthlyBudget] = useLocalStorage<number>(STORAGE_KEYS.monthlyBudget, APP_CONFIG.defaultMonthlyBudget);
  const [isDarkMode, setIsDarkMode] = useLocalStorage(STORAGE_KEYS.darkMode, false);

  // Compat setters (kept for existing code that calls setUser/setIsLoggedIn)
  const setUser = useCallback((_u: User | null) => { /* managed by Firebase */ }, []);
  const setIsLoggedIn = useCallback((_v: boolean) => { /* managed by Firebase */ }, []);

  // ─── Actions ────────────────────────────────────────────────────

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions([tx, ...transactions]);
  }, [transactions, setTransactions]);

  const updateTransaction = useCallback((id: string, tx: Transaction) => {
    setTransactions(transactions.map(t => t.id === id ? tx : t));
  }, [transactions, setTransactions]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  }, [transactions, setTransactions]);

  const addBudget = useCallback((budget: Budget) => {
    const existing = budgets.findIndex(b => b.category === budget.category);
    if (existing > -1) {
      const updated = [...budgets];
      updated[existing] = budget;
      setBudgets(updated);
    } else {
      setBudgets([...budgets, budget]);
    }
  }, [budgets, setBudgets]);

  const deleteBudget = useCallback((category: string) => {
    setBudgets(budgets.filter(b => b.category !== category));
  }, [budgets, setBudgets]);

  const addRecurring = useCallback((bill: RecurringExpense) => {
    setRecurring([...recurring, bill]);
  }, [recurring, setRecurring]);

  const updateRecurring = useCallback((id: string, bill: RecurringExpense) => {
    setRecurring(recurring.map(r => r.id === id ? bill : r));
  }, [recurring, setRecurring]);

  const deleteRecurring = useCallback((id: string) => {
    setRecurring(recurring.filter(r => r.id !== id));
  }, [recurring, setRecurring]);

  const addCategory = useCallback((name: string) => {
    if (!categories.includes(name)) {
      setCategories([...categories, name]);
    }
  }, [categories, setCategories]);

  const resetAll = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  // ─── Derived values (domain layer) ─────────────────────────────

  const monthlyTransactions = useMemo(() => Finance.filterByMonth(transactions), [transactions]);
  const monthlyTotals = useMemo(() => Finance.calculateTotals(monthlyTransactions), [monthlyTransactions]);
  const allTimeTotals = useMemo(() => Finance.calculateTotals(transactions), [transactions]);

  const initialBalance = INITIAL_ACCOUNTS.reduce((acc, curr) => acc + curr.balance, 0);
  const currentBalance = initialBalance + allTimeTotals.net;

  const safeToSpendData = useMemo(
    () => Finance.safeToSpend(monthlyBudget, monthlyTotals.expenses),
    [monthlyBudget, monthlyTotals.expenses]
  );

  const budgetStatuses = useMemo(
    () => Finance.analyzeBudgets(budgets, monthlyTransactions),
    [budgets, monthlyTransactions]
  );

  const categorySpending = useMemo(
    () => Finance.spendingByCategory(monthlyTransactions),
    [monthlyTransactions]
  );

  const momChange = useMemo(() => Finance.monthOverMonthChange(transactions), [transactions]);

  const recentTransactions = useMemo(
    () => Finance.sortByDateDesc(transactions).slice(0, 5),
    [transactions]
  );

  // ─── Context value ─────────────────────────────────────────────

  const value: AppState = {
    // Raw
    transactions, budgets, recurring, accounts, categories,
    monthlyBudget, user, isLoggedIn, isDarkMode,
    authLoading, authError,
    // Setters
    setTransactions, setBudgets, setRecurring, setAccounts,
    setCategories, setMonthlyBudget, setUser, setIsLoggedIn, setIsDarkMode,
    // Auth actions
    signInWithGoogle, signOut,
    // Actions
    addTransaction, updateTransaction, deleteTransaction,
    addBudget, deleteBudget,
    addRecurring, updateRecurring, deleteRecurring,
    addCategory, resetAll,
    // Derived
    monthlyTransactions, monthlyTotals, allTimeTotals,
    safeToSpend: safeToSpendData, budgetStatuses, categorySpending,
    momChange, recentTransactions, currentBalance,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ───────────────────────────────────────────────────────────

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
