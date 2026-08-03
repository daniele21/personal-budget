import React, { createContext, useContext, useReducer, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Transaction, Budget, RecurringExpense, Account, SavingsGoal } from '../types';
import { AppData, INITIAL_APP_DATA, syncAppData, isFinancialDataEmpty } from '../data/model';
import { appDataRepository } from '../repositories/appDataRepository';
import { attachmentRepository } from '../repositories/attachmentRepository';
import { usePreferences } from './PreferencesProvider';
import * as Finance from '../domain/finance';
import { STORAGE_KEYS } from '../data/storageKeys';
import { persistTransactionAndVerify } from '../services/payment-detection/verifiedTransactionService';
import {
  changeTransactionCategories,
  commitExistingTransactions,
  commitTransactionImport,
  undoCommittedImport,
  undoTransactionCategoryChange,
  type CategoryUndoToken,
  type CommitTransactionImportResult,
  type ImportUndoToken,
  type UndoImportResult,
} from '../services/import';
import type { PreparedTransactionImport } from '../domain/import';

// ─── State and Actions ──────────────────────────────────────────────

export type InitialDataChoice = 'blank' | 'demo' | 'restored' | null;

export interface AppDataState extends AppData {
  onboardingComplete: boolean;
  initialDataChoice: InitialDataChoice;
}

export type AppDataAction =
  | { type: 'transaction/created'; transaction: Transaction }
  | { type: 'transaction/created-many'; transactions: Transaction[] }
  | { type: 'transaction/updated'; id: string; transaction: Transaction }
  | { type: 'transaction/deleted'; id: string }
  | { type: 'budget/added'; budget: Budget }
  | { type: 'budget/deleted'; category: string }
  | { type: 'recurring/added'; expense: RecurringExpense }
  | { type: 'recurring/updated'; id: string; expense: RecurringExpense }
  | { type: 'recurring/deleted'; id: string }
  | { type: 'category/added'; name: string }
  | { type: 'category/archived-updated'; archivedCategories: string[] }
  | { type: 'savingsGoals/updated'; savingsGoals: SavingsGoal[] }
  | { type: 'monthlyBudget/updated'; monthlyBudget: number }
  | { type: 'accounts/updated'; accounts: Account[] }
  | { type: 'onboarding/completed'; complete: boolean }
  | { type: 'onboarding/initial-choice'; choice: InitialDataChoice }
  | { type: 'data/hydrated'; data: AppData }
  | { type: 'data/reset' }
  | { type: 'transactions/replaced'; transactions: Transaction[] }
  | { type: 'transactions/verified-replaced'; transactions: Transaction[] }
  | { type: 'budgets/replaced'; budgets: Budget[] }
  | { type: 'recurring/replaced'; recurring: RecurringExpense[] }
  | { type: 'categories/replaced'; categories: string[] };

// ─── Reducer ────────────────────────────────────────────────────────

export function appDataReducer(state: AppDataState, action: AppDataAction): AppDataState {
  let nextState: AppDataState;

  switch (action.type) {
    case 'transaction/created':
      nextState = {
        ...state,
        transactions: [action.transaction, ...state.transactions],
      };
      break;

    case 'transaction/created-many':
      nextState = {
        ...state,
        transactions: [...action.transactions, ...state.transactions],
      };
      break;

    case 'transaction/updated':
      nextState = {
        ...state,
        transactions: state.transactions.map(t => t.id === action.id ? action.transaction : t),
      };
      break;

    case 'transaction/deleted':
      nextState = {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.id),
      };
      break;

    case 'budget/added': {
      const existing = state.budgets.findIndex(b => b.category === action.budget.category);
      let nextBudgets = [...state.budgets];
      if (existing > -1) {
        nextBudgets[existing] = action.budget;
      } else {
        nextBudgets.push(action.budget);
      }
      nextState = { ...state, budgets: nextBudgets };
      break;
    }

    case 'budget/deleted':
      nextState = {
        ...state,
        budgets: state.budgets.filter(b => b.category !== action.category),
      };
      break;

    case 'recurring/added':
      nextState = {
        ...state,
        recurring: [...state.recurring, action.expense],
      };
      break;

    case 'recurring/updated':
      nextState = {
        ...state,
        recurring: state.recurring.map(r => r.id === action.id ? action.expense : r),
      };
      break;

    case 'recurring/deleted':
      nextState = {
        ...state,
        recurring: state.recurring.filter(r => r.id !== action.id),
      };
      break;

    case 'category/added': {
      let nextCategories = [...state.categories];
      if (!nextCategories.includes(action.name)) {
        nextCategories.push(action.name);
      }
      const nextArchived = state.archivedCategories.filter(c => c !== action.name);
      nextState = {
        ...state,
        categories: nextCategories,
        archivedCategories: nextArchived,
      };
      break;
    }

    case 'category/archived-updated':
      nextState = {
        ...state,
        archivedCategories: action.archivedCategories,
      };
      break;

    case 'savingsGoals/updated':
      nextState = {
        ...state,
        savingsGoals: action.savingsGoals,
      };
      break;

    case 'monthlyBudget/updated':
      nextState = {
        ...state,
        monthlyBudget: action.monthlyBudget,
      };
      break;

    case 'accounts/updated':
      nextState = {
        ...state,
        accounts: action.accounts,
      };
      break;

    case 'onboarding/completed':
      nextState = {
        ...state,
        onboardingComplete: action.complete,
      };
      break;

    case 'onboarding/initial-choice':
      nextState = {
        ...state,
        initialDataChoice: action.choice,
      };
      break;

    case 'data/hydrated':
      nextState = {
        ...state,
        ...action.data,
      };
      break;

    case 'data/reset':
      nextState = {
        ...INITIAL_APP_DATA,
        onboardingComplete: false,
        initialDataChoice: null,
      };
      break;

    case 'transactions/replaced':
    case 'transactions/verified-replaced':
      nextState = {
        ...state,
        transactions: action.transactions,
      };
      break;

    case 'budgets/replaced':
      nextState = {
        ...state,
        budgets: action.budgets,
      };
      break;

    case 'recurring/replaced':
      nextState = {
        ...state,
        recurring: action.recurring,
      };
      break;

    case 'categories/replaced':
      nextState = {
        ...state,
        categories: action.categories,
      };
      break;

    default:
      return state;
  }

  // Ensure state consistency by running domain-level synchronization (pure)
  const synced = syncAppData(nextState);

  return {
    ...nextState,
    transactions: synced.transactions,
    recurring: synced.recurring,
  };
}

// ─── Context Shape ──────────────────────────────────────────────────

interface AppDataContextType {
  state: AppDataState;
  dispatch: (action: AppDataAction) => void;
  createTransactionVerified: (transaction: Transaction) => Promise<void>;
  commitPreparedTransactionImport: (prepared: PreparedTransactionImport) => Promise<CommitTransactionImportResult>;
  commitExistingTransactionImport: (transactions: Transaction[]) => Promise<CommitTransactionImportResult>;
  undoTransactionImport: (token: ImportUndoToken) => Promise<UndoImportResult>;
  changeCategoriesVerified: (ids: string[], category: string) => Promise<CategoryUndoToken>;
  undoCategoriesVerified: (token: CategoryUndoToken) => Promise<void>;
  isHydrated: boolean;

  // Domain Derived Data
  monthlyTransactions: Transaction[];
  monthlyTotals: Finance.TransactionTotals;
  allTimeTotals: Finance.TransactionTotals;
  safeToSpend: Finance.SafeToSpendStatus;
  budgetStatuses: Finance.BudgetStatus[];
  categorySpending: Finance.CategorySpending[];
  expenseMomChange: number | null;
  netMomChange: number | null;
  recentTransactions: Transaction[];
  currentBalance: number;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

// ─── Provider ───────────────────────────────────────────────────────

export const AppDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedMonth, analyticsLens } = usePreferences();
  const [isHydrated, setIsHydrated] = useState(false);
  const skipNextPersistenceRef = useRef(false);

  // Initialize state from appDataRepository
  const [state, reactDispatch] = useReducer(appDataReducer, null as any, () => {
    const loadedData = appDataRepository.loadAppData();
    const onboardingComplete = localStorage.getItem(STORAGE_KEYS.onboardingComplete) === 'true';
    const initialDataChoice = localStorage.getItem(STORAGE_KEYS.initialDataChoice) as InitialDataChoice;

    return {
      ...loadedData,
      onboardingComplete,
      initialDataChoice,
    };
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Save changes to repositories/localStorage in an effect to keep the reducer pure
  useEffect(() => {
    if (!isHydrated) return;
    if (localStorage.getItem(STORAGE_KEYS.restoreInProgress) === 'true') return;
    if (skipNextPersistenceRef.current) {
      skipNextPersistenceRef.current = false;
      return;
    }
    appDataRepository.saveAppData(state);
    localStorage.setItem(STORAGE_KEYS.onboardingComplete, String(state.onboardingComplete));
    if (state.initialDataChoice) {
      localStorage.setItem(STORAGE_KEYS.initialDataChoice, state.initialDataChoice);
    } else {
      localStorage.removeItem(STORAGE_KEYS.initialDataChoice);
    }
  }, [state, isHydrated]);

  // Dispatch wrapper to execute async/side-effect operations (e.g. attachment deletion)
  const dispatch = useCallback((action: AppDataAction) => {
    if (action.type === 'transaction/deleted') {
      attachmentRepository.deleteAttachment(action.id)
        .catch(err => console.error('[AppDataProvider] Error deleting IDB attachment:', err));
    } else if (action.type === 'data/reset') {
      appDataRepository.clear();
      localStorage.removeItem(STORAGE_KEYS.onboardingComplete);
      localStorage.removeItem(STORAGE_KEYS.initialDataChoice);
      attachmentRepository.clearAllAttachments()
        .catch(err => console.error('[AppDataProvider] Error clearing IDB attachments:', err))
        .finally(() => {
          reactDispatch(action);
          window.location.reload();
        });
      return;
    }
    reactDispatch(action);
  }, []);

  const createTransactionVerified = useCallback(async (transaction: Transaction) => {
    persistTransactionAndVerify(transaction);
    reactDispatch({ type: 'transaction/created', transaction });
  }, []);

  const hydrateVerifiedTransactions = useCallback((data: AppData) => {
    skipNextPersistenceRef.current = true;
    reactDispatch({ type: 'transactions/verified-replaced', transactions: data.transactions });
  }, []);

  const commitPreparedTransactionImport = useCallback(async (prepared: PreparedTransactionImport) => {
    const result = await commitTransactionImport(prepared);
    hydrateVerifiedTransactions(result.data);
    return result;
  }, [hydrateVerifiedTransactions]);

  const commitExistingTransactionImport = useCallback(async (transactions: Transaction[]) => {
    const result = commitExistingTransactions(transactions);
    hydrateVerifiedTransactions(result.data);
    return result;
  }, [hydrateVerifiedTransactions]);

  const undoTransactionImport = useCallback(async (token: ImportUndoToken) => {
    const result = undoCommittedImport(token);
    hydrateVerifiedTransactions(result.data);
    return result;
  }, [hydrateVerifiedTransactions]);

  const changeCategoriesVerified = useCallback(async (ids: string[], category: string) => {
    const result = changeTransactionCategories(ids, category);
    hydrateVerifiedTransactions(result.data);
    return result.undoToken;
  }, [hydrateVerifiedTransactions]);

  const undoCategoriesVerified = useCallback(async (token: CategoryUndoToken) => {
    const result = undoTransactionCategoryChange(token);
    hydrateVerifiedTransactions(result.data);
  }, [hydrateVerifiedTransactions]);

  // Derived calculations
  const monthlyTransactions = useMemo(() => Finance.filterByMonth(state.transactions, selectedMonth), [state.transactions, selectedMonth]);
  const monthlyTotals = useMemo(() => Finance.calculateTotals(monthlyTransactions), [monthlyTransactions]);
  const allTimeTotals = useMemo(() => Finance.calculateTotals(state.transactions), [state.transactions]);

  const openingBalance = useMemo(() => state.accounts.reduce((acc, curr) => acc + curr.openingBalance, 0), [state.accounts]);
  const currentBalance = useMemo(() => openingBalance + allTimeTotals.net, [openingBalance, allTimeTotals.net]);

  const safeToSpendData = useMemo(
    () => Finance.safeToSpend(
      state.monthlyBudget,
      monthlyTotals.expenses,
      Finance.calculateBudgetableCashInflow(monthlyTransactions),
    ),
    [state.monthlyBudget, monthlyTotals.expenses, monthlyTransactions]
  );

  const budgetStatuses = useMemo(
    () => Finance.analyzeBudgets(state.budgets, monthlyTransactions),
    [state.budgets, monthlyTransactions]
  );

  const categorySpending = useMemo(
    () => Finance.spendingByCategory(monthlyTransactions),
    [monthlyTransactions]
  );

  const analyticsTransactions = useMemo(
    () => Finance.filterByAnalyticsLens(state.transactions, analyticsLens),
    [state.transactions, analyticsLens],
  );
  const expenseMomChange = useMemo(
    () => Finance.expenseMonthOverMonthChange(analyticsTransactions, selectedMonth),
    [analyticsTransactions, selectedMonth],
  );
  const netMomChange = useMemo(
    () => Finance.netMonthOverMonthChange(analyticsTransactions, selectedMonth),
    [analyticsTransactions, selectedMonth],
  );

  const recentTransactions = useMemo(
    () => Finance.sortByDateDesc(monthlyTransactions).slice(0, 5),
    [monthlyTransactions]
  );

  const contextValue = useMemo<AppDataContextType>(() => ({
    state,
    dispatch,
    createTransactionVerified,
    commitPreparedTransactionImport,
    commitExistingTransactionImport,
    undoTransactionImport,
    changeCategoriesVerified,
    undoCategoriesVerified,
    isHydrated,
    monthlyTransactions,
    monthlyTotals,
    allTimeTotals,
    safeToSpend: safeToSpendData,
    budgetStatuses,
    categorySpending,
    expenseMomChange,
    netMomChange,
    recentTransactions,
    currentBalance,
  }), [
    state,
    dispatch,
    createTransactionVerified,
    commitPreparedTransactionImport,
    commitExistingTransactionImport,
    undoTransactionImport,
    changeCategoriesVerified,
    undoCategoriesVerified,
    isHydrated,
    monthlyTransactions,
    monthlyTotals,
    allTimeTotals,
    safeToSpendData,
    budgetStatuses,
    categorySpending,
    expenseMomChange,
    netMomChange,
    recentTransactions,
    currentBalance,
  ]);

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
