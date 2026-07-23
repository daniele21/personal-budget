import { AppData, INITIAL_APP_DATA, normalizeAppData } from '../data/model';
import { validateAppData } from '../domain/archive';
import { STORAGE_KEYS } from '../data/storageKeys';

export const appDataRepository = {
  loadAppDataStrict(): AppData {
    const transactions = window.localStorage.getItem(STORAGE_KEYS.transactions);
    const budgets = window.localStorage.getItem(STORAGE_KEYS.budgets);
    const recurring = window.localStorage.getItem(STORAGE_KEYS.recurring);
    const accounts = window.localStorage.getItem(STORAGE_KEYS.accounts);
    const categories = window.localStorage.getItem(STORAGE_KEYS.categories);
    const archivedCategories = window.localStorage.getItem(STORAGE_KEYS.archivedCategories);
    const savingsGoals = window.localStorage.getItem(STORAGE_KEYS.savingsGoals);
    const monthlyBudget = window.localStorage.getItem(STORAGE_KEYS.monthlyBudget);
    const normalized = normalizeAppData({
      transactions: transactions ? JSON.parse(transactions) : undefined,
      budgets: budgets ? JSON.parse(budgets) : undefined,
      recurring: recurring ? JSON.parse(recurring) : undefined,
      accounts: accounts ? JSON.parse(accounts) : undefined,
      categories: categories ? JSON.parse(categories) : undefined,
      archivedCategories: archivedCategories ? JSON.parse(archivedCategories) : undefined,
      savingsGoals: savingsGoals ? JSON.parse(savingsGoals) : undefined,
      monthlyBudget: monthlyBudget ? JSON.parse(monthlyBudget) : undefined,
    });
    return validateAppData(normalized).value;
  },

  loadAppData(): AppData {
    try {
      return appDataRepository.loadAppDataStrict();
    } catch (error) {
      console.error('[AppDataRepository] Error loading app data:', error);
      return INITIAL_APP_DATA;
    }
  },

  saveAppData(data: AppData): void {
    try {
      appDataRepository.saveAppDataStrict(data);
    } catch (error) {
      console.error('[AppDataRepository] Error saving app data:', error);
    }
  },

  saveAppDataStrict(data: AppData): void {
    const validated = validateAppData(data).value;
    window.localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(validated.transactions));
    window.localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(validated.budgets));
    window.localStorage.setItem(STORAGE_KEYS.recurring, JSON.stringify(validated.recurring));
    window.localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(validated.accounts));
    window.localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(validated.categories));
    window.localStorage.setItem(STORAGE_KEYS.archivedCategories, JSON.stringify(validated.archivedCategories));
    window.localStorage.setItem(STORAGE_KEYS.savingsGoals, JSON.stringify(validated.savingsGoals));
    window.localStorage.setItem(STORAGE_KEYS.monthlyBudget, JSON.stringify(validated.monthlyBudget));
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('[AppDataRepository] Error clearing localStorage:', error);
    }
  }
};
