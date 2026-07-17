import { AppData, INITIAL_APP_DATA, normalizeAppData } from '../data/model';
import { STORAGE_KEYS } from '../data/storageKeys';

export const appDataRepository = {
  loadAppData(): AppData {
    try {
      const transactions = localStorage.getItem(STORAGE_KEYS.transactions);
      const budgets = localStorage.getItem(STORAGE_KEYS.budgets);
      const recurring = localStorage.getItem(STORAGE_KEYS.recurring);
      const accounts = localStorage.getItem(STORAGE_KEYS.accounts);
      const categories = localStorage.getItem(STORAGE_KEYS.categories);
      const archivedCategories = localStorage.getItem(STORAGE_KEYS.archivedCategories);
      const savingsGoals = localStorage.getItem(STORAGE_KEYS.savingsGoals);
      const monthlyBudget = localStorage.getItem(STORAGE_KEYS.monthlyBudget);

      return normalizeAppData({
        transactions: transactions ? JSON.parse(transactions) : undefined,
        budgets: budgets ? JSON.parse(budgets) : undefined,
        recurring: recurring ? JSON.parse(recurring) : undefined,
        accounts: accounts ? JSON.parse(accounts) : undefined,
        categories: categories ? JSON.parse(categories) : undefined,
        archivedCategories: archivedCategories ? JSON.parse(archivedCategories) : undefined,
        savingsGoals: savingsGoals ? JSON.parse(savingsGoals) : undefined,
        monthlyBudget: monthlyBudget ? JSON.parse(monthlyBudget) : undefined,
      });
    } catch (error) {
      console.error('[AppDataRepository] Error loading app data:', error);
      return INITIAL_APP_DATA;
    }
  },

  saveAppData(data: AppData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(data.transactions));
      localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(data.budgets));
      localStorage.setItem(STORAGE_KEYS.recurring, JSON.stringify(data.recurring));
      localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(data.accounts));
      localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(data.categories));
      localStorage.setItem(STORAGE_KEYS.archivedCategories, JSON.stringify(data.archivedCategories));
      localStorage.setItem(STORAGE_KEYS.savingsGoals, JSON.stringify(data.savingsGoals));
      localStorage.setItem(STORAGE_KEYS.monthlyBudget, JSON.stringify(data.monthlyBudget));
    } catch (error) {
      console.error('[AppDataRepository] Error saving app data:', error);
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('[AppDataRepository] Error clearing localStorage:', error);
    }
  }
};
