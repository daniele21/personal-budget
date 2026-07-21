import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { AuthProvider, useAuth } from '../state/AuthProvider';
import { PreferencesProvider, usePreferences } from '../state/PreferencesProvider';
import { AppDataProvider, useAppData, InitialDataChoice } from '../state/AppDataProvider';
import { BackupProvider, useBackup } from '../state/BackupProvider';
import { Transaction, Budget, RecurringExpense, Account, User, SavingsGoal } from '../types';
import * as Finance from '../domain/finance';
import { InitialDataDialog } from '../components/InitialDataDialog';
import { OnboardingDialog } from '../components/OnboardingDialog';
import { buildDemoData } from '../data/demoData';
import { PrimaryAnalyticsLens } from '../domain/finance';

// ─── Legacy Context Shape (compatible facade) ───────────────────────

interface AppState {
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
  analyticsLens: PrimaryAnalyticsLens;

  // Compatible Setters
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
  setAnalyticsLens: (lens: PrimaryAnalyticsLens) => void;

  // Compatible Auth actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Compatible Actions
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

  // Derived
  monthlyTransactions: Transaction[];
  monthlyTotals: Finance.TransactionTotals;
  allTimeTotals: Finance.TransactionTotals;
  safeToSpend: Finance.SafeToSpendStatus;
  budgetStatuses: Finance.BudgetStatus[];
  categorySpending: Finance.CategorySpending[];
  momChange: number | null;
  recentTransactions: Transaction[];
  currentBalance: number;
}

const LegacyAppContext = createContext<AppState | null>(null);

// ─── Dialogs and Facade Orchestration ─────────────────────────────────

const MainAppWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, authLoading, authError, isAdmin, isLoggedIn, signInWithGoogle, signOut } = useAuth();
  const {
    isDarkMode,
    setIsDarkMode,
    selectedMonth,
    setSelectedMonth,
    analyticsLens,
    setAnalyticsLens,
  } = usePreferences();
  const {
    state,
    dispatch,
    isHydrated,
    monthlyTransactions,
    monthlyTotals,
    allTimeTotals,
    safeToSpend,
    budgetStatuses,
    categorySpending,
    momChange,
    recentTransactions,
    currentBalance,
  } = useAppData();

  const {
    cloudBackupEnabled,
    setCloudBackupEnabled,
    backupAvailable,
    backupStatus,
    lastBackupDate,
    backupCheckComplete,
    restoreFromCloud,
    dismissRestore,
    deleteCloudBackup,
    pushBackupNow,
  } = useBackup();

  const isLocalEmpty = useCallback(
    () => state.transactions.length === 0 && state.budgets.length === 0 && state.recurring.length === 0,
    [state.transactions, state.budgets, state.recurring]
  );

  const applyDemoData = useCallback(() => {
    const demo = buildDemoData();
    dispatch({ type: 'data/hydrated', data: demo });
  }, [dispatch]);

  const handleRestoreBackup = useCallback(async () => {
    const restored = await restoreFromCloud();
    if (restored) {
      setCloudBackupEnabled(true);
      dispatch({ type: 'onboarding/initial-choice', choice: 'restored' });
      dispatch({ type: 'onboarding/completed', complete: true });
    }
  }, [restoreFromCloud, setCloudBackupEnabled, dispatch]);

  const handleStartBlank = useCallback(() => {
    if (backupAvailable) {
      setCloudBackupEnabled(false);
    }
    dispatch({ type: 'onboarding/initial-choice', choice: 'blank' });
    dismissRestore();
  }, [backupAvailable, dismissRestore, setCloudBackupEnabled, dispatch]);

  const handleUseDemoData = useCallback(() => {
    if (backupAvailable) {
      setCloudBackupEnabled(false);
    }
    applyDemoData();
    dispatch({ type: 'onboarding/initial-choice', choice: 'demo' });
    dispatch({ type: 'onboarding/completed', complete: true });
    dismissRestore();
  }, [applyDemoData, backupAvailable, dismissRestore, setCloudBackupEnabled, dispatch]);

  // Facade Setters mapping to semantic command dispatches
  const setTransactions = useCallback((txs: Transaction[]) => dispatch({ type: 'transactions/replaced', transactions: txs }), [dispatch]);
  const setBudgets = useCallback((budgets: Budget[]) => dispatch({ type: 'budgets/replaced', budgets }), [dispatch]);
  const setRecurring = useCallback((recurring: RecurringExpense[]) => dispatch({ type: 'recurring/replaced', recurring }), [dispatch]);
  const setAccounts = useCallback((accounts: Account[]) => dispatch({ type: 'accounts/updated', accounts }), [dispatch]);
  const setCategories = useCallback((categories: string[]) => dispatch({ type: 'categories/replaced', categories }), [dispatch]);
  const setArchivedCategories = useCallback((archived: string[]) => dispatch({ type: 'category/archived-updated', archivedCategories: archived }), [dispatch]);
  const setSavingsGoals = useCallback((goals: SavingsGoal[]) => dispatch({ type: 'savingsGoals/updated', savingsGoals: goals }), [dispatch]);
  const setMonthlyBudget = useCallback((budget: number) => dispatch({ type: 'monthlyBudget/updated', monthlyBudget: budget }), [dispatch]);
  const setOnboardingComplete = useCallback((v: boolean) => dispatch({ type: 'onboarding/completed', complete: v }), [dispatch]);

  // Compatibility Setters (no-op or handled elsewhere)
  const setUser = useCallback(() => {}, []);
  const setIsLoggedIn = useCallback(() => {}, []);

  // Facade Action mappings
  const addTransaction = useCallback((tx: Transaction) => dispatch({ type: 'transaction/created', transaction: tx }), [dispatch]);
  const addTransactions = useCallback((txs: Transaction[]) => dispatch({ type: 'transaction/created-many', transactions: txs }), [dispatch]);
  const updateTransaction = useCallback((id: string, tx: Transaction) => dispatch({ type: 'transaction/updated', id, transaction: tx }), [dispatch]);
  const deleteTransaction = useCallback((id: string) => dispatch({ type: 'transaction/deleted', id }), [dispatch]);
  const addBudget = useCallback((budget: Budget) => dispatch({ type: 'budget/added', budget }), [dispatch]);
  const deleteBudget = useCallback((category: string) => dispatch({ type: 'budget/deleted', category }), [dispatch]);
  const addRecurring = useCallback((bill: RecurringExpense) => dispatch({ type: 'recurring/added', expense: bill }), [dispatch]);
  const updateRecurring = useCallback((id: string, bill: RecurringExpense) => dispatch({ type: 'recurring/updated', id, expense: bill }), [dispatch]);
  const deleteRecurring = useCallback((id: string) => dispatch({ type: 'recurring/deleted', id }), [dispatch]);
  const addCategory = useCallback((name: string) => dispatch({ type: 'category/added', name }), [dispatch]);
  const resetAll = useCallback(() => dispatch({ type: 'data/reset' }), [dispatch]);

  const value = useMemo<AppState>(() => ({
    transactions: state.transactions,
    budgets: state.budgets,
    recurring: state.recurring,
    accounts: state.accounts,
    categories: state.categories,
    archivedCategories: state.archivedCategories,
    savingsGoals: state.savingsGoals,
    monthlyBudget: state.monthlyBudget,
    user,
    isLoggedIn,
    isDarkMode,
    cloudBackupEnabled,
    backupAvailable,
    backupStatus,
    lastBackupDate,
    onboardingComplete: state.onboardingComplete,
    authLoading,
    authError,
    isAdmin,
    isHydrated,
    selectedMonth,
    analyticsLens,

    setTransactions,
    setBudgets,
    setRecurring,
    setAccounts,
    setCategories,
    setArchivedCategories,
    setSavingsGoals,
    setMonthlyBudget,
    setUser,
    setIsLoggedIn,
    setIsDarkMode,
    setCloudBackupEnabled,
    setOnboardingComplete,
    setSelectedMonth,
    setAnalyticsLens,

    signInWithGoogle,
    signOut,

    addTransaction,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    addBudget,
    deleteBudget,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    addCategory,
    resetAll,
    restoreFromCloud,
    dismissRestore,
    deleteCloudBackup,
    pushBackupNow,

    monthlyTransactions,
    monthlyTotals,
    allTimeTotals,
    safeToSpend,
    budgetStatuses,
    categorySpending,
    momChange,
    recentTransactions,
    currentBalance,
  }), [
    state,
    user,
    isLoggedIn,
    isDarkMode,
    cloudBackupEnabled,
    backupAvailable,
    backupStatus,
    lastBackupDate,
    authLoading,
    authError,
    isAdmin,
    isHydrated,
    selectedMonth,
    analyticsLens,
    setTransactions,
    setBudgets,
    setRecurring,
    setAccounts,
    setCategories,
    setArchivedCategories,
    setSavingsGoals,
    setMonthlyBudget,
    setUser,
    setIsLoggedIn,
    setIsDarkMode,
    setCloudBackupEnabled,
    setOnboardingComplete,
    setSelectedMonth,
    setAnalyticsLens,
    signInWithGoogle,
    signOut,
    addTransaction,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    addBudget,
    deleteBudget,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    addCategory,
    resetAll,
    restoreFromCloud,
    dismissRestore,
    deleteCloudBackup,
    pushBackupNow,
    monthlyTransactions,
    monthlyTotals,
    allTimeTotals,
    safeToSpend,
    budgetStatuses,
    categorySpending,
    momChange,
    recentTransactions,
    currentBalance,
  ]);

  const showInitialDataDialog = (
    isLoggedIn &&
    isHydrated &&
    backupCheckComplete &&
    isLocalEmpty() &&
    state.initialDataChoice === null
  );

  return (
    <LegacyAppContext.Provider value={value}>
      {children}
      <InitialDataDialog
        isOpen={showInitialDataDialog}
        backupAvailable={backupAvailable}
        onRestoreBackup={handleRestoreBackup}
        onStartBlank={handleStartBlank}
        onUseDemoData={handleUseDemoData}
      />
      <OnboardingDialog
        isOpen={isLoggedIn && !showInitialDataDialog && !state.onboardingComplete && state.initialDataChoice === 'blank' && isLocalEmpty()}
        monthlyBudget={state.monthlyBudget}
        onSetMonthlyBudget={setMonthlyBudget}
        onAddCategory={addCategory}
        onAddGoal={(goal) => setSavingsGoals([...state.savingsGoals, goal])}
        cloudBackupEnabled={cloudBackupEnabled}
        onSetCloudBackupEnabled={setCloudBackupEnabled}
        onComplete={() => setOnboardingComplete(true)}
      />
    </LegacyAppContext.Provider>
  );
};

// ─── Provider Root ───────────────────────────────────────────────────

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <AppDataProvider>
          <BackupProvider>
            <MainAppWrapper>{children}</MainAppWrapper>
          </BackupProvider>
        </AppDataProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
};

export function useApp(): AppState {
  const ctx = useContext(LegacyAppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
