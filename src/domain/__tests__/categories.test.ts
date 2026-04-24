import { describe, expect, it } from 'vitest';
import {
  addCategoryName,
  archiveCategoryName,
  categoryExists,
  deleteCategoryName,
  getCategoryUsageCounts,
  normalizeCategoryName,
  restoreCategoryName,
  renameCategoryName,
  renameCategoryReferences,
} from '../categories';
import { Budget, RecurringExpense, Transaction } from '../../types';

function tx(category: string): Transaction {
  return {
    id: `tx-${category}`,
    amount: 10,
    type: 'expense',
    category,
    date: '2026-01-01',
    title: category,
    description: '',
    paymentMethod: 'cash',
  };
}

function budget(category: string): Budget {
  return { category, limit: 100, spent: 0, currency: '€' };
}

function recurring(category: string): RecurringExpense {
  return { id: `rec-${category}`, name: category, amount: 10, dueDate: '2026-01-01', category };
}

describe('category domain helpers', () => {
  it('normalizes whitespace in category names', () => {
    expect(normalizeCategoryName('  Food   &   Drinks  ')).toBe('Food & Drinks');
  });

  it('detects duplicate categories case-insensitively', () => {
    expect(categoryExists(['Housing', 'Groceries'], ' groceries ')).toBe(true);
    expect(categoryExists(['Housing', 'Groceries'], ' groceries ', 'Groceries')).toBe(false);
  });

  it('adds, renames, and deletes category names without duplicating existing names', () => {
    expect(addCategoryName(['Housing'], ' Groceries ')).toEqual(['Housing', 'Groceries']);
    expect(addCategoryName(['Housing'], ' housing ')).toEqual(['Housing']);
    expect(renameCategoryName(['Housing', 'Food'], 'Food', ' Dining ')).toEqual(['Housing', 'Dining']);
    expect(renameCategoryName(['Housing', 'Food'], 'Food', ' housing ')).toEqual(['Housing', 'Food']);
    expect(deleteCategoryName(['Housing', 'Food'], 'Food')).toEqual(['Housing']);
  });

  it('counts category usage across transactions, budgets, and recurring items', () => {
    const counts = getCategoryUsageCounts({
      transactions: [tx('Food'), tx('Food'), tx('Transport')],
      budgets: [budget('Food')],
      recurring: [recurring('Transport')],
    });

    expect(counts.Food).toEqual({ transactions: 2, budgets: 1, recurring: 0, total: 3 });
    expect(counts.Transport).toEqual({ transactions: 1, budgets: 0, recurring: 1, total: 2 });
  });

  it('renames category references in all data sets', () => {
    const result = renameCategoryReferences({
      transactions: [tx('Food'), tx('Transport')],
      budgets: [budget('Food')],
      recurring: [recurring('Food')],
    }, 'Food', 'Dining');

    expect(result.transactions.map((item) => item.category)).toEqual(['Dining', 'Transport']);
    expect(result.budgets.map((item) => item.category)).toEqual(['Dining']);
    expect(result.recurring.map((item) => item.category)).toEqual(['Dining']);
  });

  it('archives and restores category names without changing historical references', () => {
    const archived = archiveCategoryName(['Housing', 'Food'], ['Transport'], 'Food');
    expect(archived.activeCategories).toEqual(['Housing']);
    expect(archived.archivedCategories).toEqual(['Transport', 'Food']);

    const restored = restoreCategoryName(archived.activeCategories, archived.archivedCategories, 'Food');
    expect(restored.activeCategories).toEqual(['Housing', 'Food']);
    expect(restored.archivedCategories).toEqual(['Transport']);
  });
});
