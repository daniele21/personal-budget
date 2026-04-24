import { Budget, RecurringExpense, Transaction } from '../types';

export interface CategoryUsage {
  transactions: number;
  budgets: number;
  recurring: number;
  total: number;
}

export interface CategoryDataSet {
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringExpense[];
}

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function categoryExists(categories: string[], name: string, exceptName?: string): boolean {
  const normalized = normalizeCategoryName(name).toLocaleLowerCase();
  const except = exceptName ? normalizeCategoryName(exceptName).toLocaleLowerCase() : null;

  return categories.some((category) => {
    const current = normalizeCategoryName(category).toLocaleLowerCase();
    return current === normalized && current !== except;
  });
}

export function addCategoryName(categories: string[], name: string): string[] {
  const normalized = normalizeCategoryName(name);
  if (!normalized || categoryExists(categories, normalized)) return categories;
  return [...categories, normalized];
}

export function renameCategoryName(categories: string[], oldName: string, newName: string): string[] {
  const normalized = normalizeCategoryName(newName);
  if (!normalized || categoryExists(categories, normalized, oldName)) return categories;
  return categories.map((category) => (category === oldName ? normalized : category));
}

export function deleteCategoryName(categories: string[], name: string): string[] {
  return categories.filter((category) => category !== name);
}

export function archiveCategoryName(activeCategories: string[], archivedCategories: string[], name: string) {
  const nextActive = activeCategories.filter((category) => category !== name);
  const nextArchived = archivedCategories.some((category) => category === name)
    ? archivedCategories
    : [...archivedCategories, name];

  return { activeCategories: nextActive, archivedCategories: nextArchived };
}

export function restoreCategoryName(activeCategories: string[], archivedCategories: string[], name: string) {
  const normalized = normalizeCategoryName(name);
  const nextArchived = archivedCategories.filter((category) => category !== name);
  const nextActive = categoryExists(activeCategories, normalized)
    ? activeCategories
    : [...activeCategories, normalized];

  return { activeCategories: nextActive, archivedCategories: nextArchived };
}

export function getCategoryUsageCounts(data: CategoryDataSet): Record<string, CategoryUsage> {
  const counts: Record<string, CategoryUsage> = {};

  const ensure = (category: string): CategoryUsage => {
    if (!counts[category]) {
      counts[category] = { transactions: 0, budgets: 0, recurring: 0, total: 0 };
    }
    return counts[category];
  };

  data.transactions.forEach((transaction) => {
    const count = ensure(transaction.category);
    count.transactions += 1;
    count.total += 1;
  });

  data.budgets.forEach((budget) => {
    const count = ensure(budget.category);
    count.budgets += 1;
    count.total += 1;
  });

  data.recurring.forEach((bill) => {
    const count = ensure(bill.category);
    count.recurring += 1;
    count.total += 1;
  });

  return counts;
}

export function renameCategoryReferences(
  data: CategoryDataSet,
  oldName: string,
  newName: string,
): CategoryDataSet {
  const normalized = normalizeCategoryName(newName);
  if (!normalized || normalized === oldName) return data;

  return {
    transactions: data.transactions.map((transaction) => (
      transaction.category === oldName ? { ...transaction, category: normalized } : transaction
    )),
    budgets: data.budgets.map((budget) => (
      budget.category === oldName ? { ...budget, category: normalized } : budget
    )),
    recurring: data.recurring.map((bill) => (
      bill.category === oldName ? { ...bill, category: normalized } : bill
    )),
  };
}
