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
import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { useCloudBackup } from '../hooks/useCloudBackup';
import { STORAGE_KEYS } from '../data/storageKeys';
import { APP_CONFIG, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, INITIAL_RECURRING, INITIAL_ACCOUNTS, INITIAL_CATEGORIES, INITIAL_SAVINGS_GOALS } from '../constants';
import { buildDemoData } from '../data/demoData';
import { Transaction, Budget, RecurringExpense, Account, User, SavingsGoal } from '../types';
import { InitialDataDialog } from '../components/InitialDataDialog';
import { OnboardingDialog } from '../components/OnboardingDialog';
import * as Finance from '../domain/finance';
import { normalizeRecurringExpenses, reconcileRecurringTransactions } from '../domain/recurring';

// ─── Context Shape ──────────────────────────────────────────────────

interface AppState {
  // Raw data
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringExpense[];
  accounts: Account[];
  categories: string[];
  archivedCategories: string[];
  savingsGoals: SavingsGoal[];
  monthlyBudget: number;
  user: User | null;
  isLoggedIn: boolean;
  isDarkMode: boolean;
  cloudBackupEnabled: boolean;
  backupAvailable: boolean;
  backupStatus: 'idle' | 'syncing' | 'success' | 'error' | 'skipped';
  lastBackupDate: string | null;
  onboardingComplete: boolean;
  authLoading: boolean;
  authError: string | null;
  isAdmin: boolean;
  isHydrated: boolean;
  selectedMonth: Date;

  // Setters
  setTransactions: (txs: Transaction[]) => void;
  setBudgets: (budgets: Budget[]) => void;
  setRecurring: (recurring: RecurringExpense[]) => void;
  setAccounts: (accounts: Account[]) => void;
  setCategories: (categories: string[]) => void;
  setArchivedCategories: (categories: string[]) => void;
  setSavingsGoals: (goals: SavingsGoal[]) => void;
  setMonthlyBudget: (budget: number) => void;
  setUser: (user: User | null) => void;
  setIsLoggedIn: (v: boolean) => void;
  setIsDarkMode: (v: boolean) => void;
  setCloudBackupEnabled: (v: boolean) => void;
  setOnboardingComplete: (v: boolean) => void;
  setSelectedMonth: (date: Date) => void;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Actions
  addTransaction: (tx: Transaction) => void;
  addTransactions: (txs: Transaction[]) => void;
  updateTransaction: (id: string, tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (budget: Budget) => void;
  deleteBudget: (category: string) => void;
  addRecurring: (bill: RecurringExpense) => void;
  updateRecurring: (id: string, bill: RecurringExpense) => void;
  deleteRecurring: (id: string) => void;
  addCategory: (name: string) => void;
  resetAll: () => void;
  restoreFromCloud: () => Promise<boolean>;
  dismissRestore: () => void;
  deleteCloudBackup: () => Promise<boolean>;
  pushBackupNow: () => Promise<boolean>;

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
type InitialDataChoice = 'blank' | 'demo' | 'restored' | null;

// ─── Provider ───────────────────────────────────────────────────────

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Firebase auth
  const { user, loading: authLoading, error: authError, isAdmin, signInWithGoogle, signOut } = useFirebaseAuth();
  const isLoggedIn = user !== null;

  // Persisted state
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>(STORAGE_KEYS.budgets, INITIAL_BUDGETS);
  const [storedRecurring, setStoredRecurring] = useLocalStorage<RecurringExpense[]>(STORAGE_KEYS.recurring, INITIAL_RECURRING);
  const [accounts, setAccounts] = useLocalStorage<Account[]>(STORAGE_KEYS.accounts, INITIAL_ACCOUNTS);
  const [categories, setCategories] = useLocalStorage<string[]>(STORAGE_KEYS.categories, INITIAL_CATEGORIES);
  const [archivedCategories, setArchivedCategories] = useLocalStorage<string[]>(STORAGE_KEYS.archivedCategories, []);
  const [savingsGoals, setSavingsGoals] = useLocalStorage<SavingsGoal[]>(STORAGE_KEYS.savingsGoals, INITIAL_SAVINGS_GOALS);
  const [monthlyBudget, setMonthlyBudget] = useLocalStorage<number>(STORAGE_KEYS.monthlyBudget, APP_CONFIG.defaultMonthlyBudget);
  const [isDarkMode, setIsDarkMode] = useLocalStorage(STORAGE_KEYS.darkMode, false);
  const [cloudBackupEnabled, setCloudBackupEnabled] = useLocalStorage(STORAGE_KEYS.cloudBackupEnabled, false);
  const [onboardingComplete, setOnboardingComplete] = useLocalStorage(STORAGE_KEYS.onboardingComplete, false);
  const [initialDataChoice, setInitialDataChoice] = useLocalStorage<InitialDataChoice>(STORAGE_KEYS.initialDataChoice, null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const recurring = useMemo(
    () => normalizeRecurringExpenses(storedRecurring),
    [storedRecurring],
  );

  const setRecurring = useCallback((nextRecurring: RecurringExpense[]) => {
    setStoredRecurring(normalizeRecurringExpenses(nextRecurring));
  }, [setStoredRecurring]);

  useEffect(() => {
    if (JSON.stringify(storedRecurring) !== JSON.stringify(recurring)) {
      setStoredRecurring(recurring);
    }
  }, [storedRecurring, recurring, setStoredRecurring]);

  useEffect(() => {
    const reconciledTransactions = reconcileRecurringTransactions(transactions, recurring);
    if (JSON.stringify(reconciledTransactions) !== JSON.stringify(transactions)) {
      setTransactions(reconciledTransactions);
    }
  }, [transactions, recurring, setTransactions]);

  // Compat setters (kept for existing code that calls setUser/setIsLoggedIn)
  const setUser = useCallback((_u: User | null) => { /* managed by Firebase */ }, []);
  const setIsLoggedIn = useCallback((_v: boolean) => { /* managed by Firebase */ }, []);

  // ─── Actions ────────────────────────────────────────────────────

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
  }, [setTransactions]);

  const addTransactions = useCallback((txs: Transaction[]) => {
    setTransactions(prev => [...txs, ...prev]);
  }, [setTransactions]);

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
    if (archivedCategories.includes(name)) {
      setArchivedCategories(archivedCategories.filter((category) => category !== name));
    }
  }, [categories, archivedCategories, setCategories, setArchivedCategories]);

  const resetAll = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  // ─── Cloud backup (non-blocking daily sync) ────────────────────

  const getBackupData = useCallback(() => ({
    transactions, budgets, recurring, accounts, categories, archivedCategories, savingsGoals, monthlyBudget,
  }), [transactions, budgets, recurring, accounts, categories, archivedCategories, savingsGoals, monthlyBudget]);

  const isLocalEmpty = useCallback(
    () => transactions.length === 0 && budgets.length === 0 && recurring.length === 0,
    [transactions, budgets, recurring],
  );

  const applyBackupData = useCallback((data: import('../lib/backup').BackupPayload) => {
    setTransactions(data.transactions as typeof transactions);
    setBudgets(data.budgets as typeof budgets);
    setRecurring(normalizeRecurringExpenses(data.recurring as typeof recurring));
    setAccounts(data.accounts as typeof accounts);
    setCategories(data.categories);
    setArchivedCategories(data.archivedCategories ?? []);
    setSavingsGoals((data.savingsGoals ?? []) as typeof savingsGoals);
    setMonthlyBudget(data.monthlyBudget);
  }, [setTransactions, setBudgets, setRecurring, setAccounts, setCategories, setArchivedCategories, setSavingsGoals, setMonthlyBudget]);

  const { restoreFromCloud, backupAvailable, backupCheckComplete, dismissRestore, deleteCloudBackup, pushNow, backupStatus, lastBackupDate } = useCloudBackup({
    uid: user?.id ?? null,
    enabled: cloudBackupEnabled,
    getData: getBackupData,
    isLocalEmpty,
    applyData: applyBackupData,
  });

  // Expose manual push to UI
  const pushBackupNow = useCallback(async (): Promise<boolean> => {
    if (typeof pushNow === 'function') {
      return await pushNow();
    }
    return false;
  }, [pushNow]);

  const applyDemoData = useCallback(() => {
    const demoData = buildDemoData();
    setTransactions(demoData.transactions);
    setBudgets(demoData.budgets);
    setRecurring(demoData.recurring);
    setAccounts(demoData.accounts);
    setCategories(demoData.categories);
    setArchivedCategories(demoData.archivedCategories);
    setSavingsGoals(demoData.savingsGoals);
    setMonthlyBudget(demoData.monthlyBudget);
  }, [setTransactions, setBudgets, setRecurring, setAccounts, setCategories, setArchivedCategories, setSavingsGoals, setMonthlyBudget]);

  const handleRestoreBackup = useCallback(async () => {
    const restored = await restoreFromCloud();
    if (restored) {
      setCloudBackupEnabled(true);
      setInitialDataChoice('restored');
      setOnboardingComplete(true);
    }
  }, [restoreFromCloud, setCloudBackupEnabled, setInitialDataChoice, setOnboardingComplete]);

  const handleStartBlank = useCallback(() => {
    if (backupAvailable) {
      setCloudBackupEnabled(false);
    }
    setInitialDataChoice('blank');
    dismissRestore();
  }, [backupAvailable, dismissRestore, setCloudBackupEnabled, setInitialDataChoice]);

  const handleUseDemoData = useCallback(() => {
    if (backupAvailable) {
      setCloudBackupEnabled(false);
    }
    applyDemoData();
    setInitialDataChoice('demo');
    setOnboardingComplete(true);
    dismissRestore();
  }, [applyDemoData, backupAvailable, dismissRestore, setCloudBackupEnabled, setInitialDataChoice, setOnboardingComplete]);

  // ─── Derived values (domain layer) ─────────────────────────────

  const currentMonthTransactions = useMemo(() => Finance.filterByMonth(transactions, new Date()), [transactions]);
  const monthlyTransactions = useMemo(() => Finance.filterByMonth(transactions, selectedMonth), [transactions, selectedMonth]);
  const monthlyTotals = useMemo(() => Finance.calculateTotals(monthlyTransactions), [monthlyTransactions]);
  const allTimeTotals = useMemo(() => Finance.calculateTotals(transactions), [transactions]);

  const initialBalance = INITIAL_ACCOUNTS.reduce((acc, curr) => acc + curr.balance, 0);
  const currentBalance = initialBalance + allTimeTotals.net;

  const safeToSpendData = useMemo(
    () => Finance.safeToSpend(monthlyBudget, monthlyTotals.expenses),
    [monthlyBudget, monthlyTotals.expenses]
  );

  const budgetStatuses = useMemo(
    () => Finance.analyzeBudgets(budgets, currentMonthTransactions),
    [budgets, currentMonthTransactions]
  );

  const categorySpending = useMemo(
    () => Finance.spendingByCategory(monthlyTransactions),
    [monthlyTransactions]
  );

  const momChange = useMemo(() => Finance.monthOverMonthChange(transactions, selectedMonth), [transactions, selectedMonth]);

  const recentTransactions = useMemo(
    () => Finance.sortByDateDesc(transactions).slice(0, 5),
    [transactions]
  );

  const showInitialDataDialog = (
    isLoggedIn &&
    isHydrated &&
    backupCheckComplete &&
    isLocalEmpty() &&
    initialDataChoice === null
  );

  // ─── Context value ─────────────────────────────────────────────

  const value: AppState = {
    // Raw
    transactions, budgets, recurring, accounts, categories, archivedCategories, savingsGoals,
    monthlyBudget, user, isLoggedIn, isDarkMode, cloudBackupEnabled, backupAvailable,
    backupStatus, lastBackupDate, onboardingComplete,
    authLoading, authError, isAdmin, isHydrated, selectedMonth,
    // Setters
    setTransactions, setBudgets, setRecurring, setAccounts,
    setCategories, setArchivedCategories, setSavingsGoals, setMonthlyBudget, setUser, setIsLoggedIn, setIsDarkMode,
    setCloudBackupEnabled, setOnboardingComplete, setSelectedMonth,
    // Auth actions
    signInWithGoogle, signOut,
    // Actions
    addTransaction, addTransactions, updateTransaction, deleteTransaction,
    addBudget, deleteBudget,
    addRecurring, updateRecurring, deleteRecurring,
    addCategory, resetAll, restoreFromCloud, dismissRestore, deleteCloudBackup, pushBackupNow,
    // Derived
    monthlyTransactions, monthlyTotals, allTimeTotals,
    safeToSpend: safeToSpendData, budgetStatuses, categorySpending,
    momChange, recentTransactions, currentBalance,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <InitialDataDialog
        isOpen={showInitialDataDialog}
        backupAvailable={backupAvailable}
        onRestoreBackup={handleRestoreBackup}
        onStartBlank={handleStartBlank}
        onUseDemoData={handleUseDemoData}
      />
      <OnboardingDialog
        isOpen={isLoggedIn && !showInitialDataDialog && !onboardingComplete && initialDataChoice === 'blank' && isLocalEmpty()}
        monthlyBudget={monthlyBudget}
        onSetMonthlyBudget={setMonthlyBudget}
        onAddCategory={addCategory}
        onAddGoal={(goal) => setSavingsGoals([...savingsGoals, goal])}
        cloudBackupEnabled={cloudBackupEnabled}
        onSetCloudBackupEnabled={setCloudBackupEnabled}
        onComplete={() => setOnboardingComplete(true)}
      />
    </AppContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────────────────

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
