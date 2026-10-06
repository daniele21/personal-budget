import type { Transaction } from '../types';

export interface HistoricalCategorySuggestion {
  category: string;
  matchCount: number;
}

export type CategoryHistoryIndex = ReadonlyMap<
  string,
  ReadonlyMap<string, number>
>;

export function buildCategoryHistoryIndex(
  ledger: readonly Transaction[],
  matchKeyForTransaction: (transaction: Transaction) => string | null,
): Map<string, Map<string, number>> {
  const history = new Map<string, Map<string, number>>();

  for (const transaction of ledger) {
    if (!transaction.category || transaction.category === 'Uncategorized') {
      continue;
    }

    const matchKey = matchKeyForTransaction(transaction);
    if (!matchKey) continue;

    const categories = history.get(matchKey) ?? new Map<string, number>();
    categories.set(
      transaction.category,
      (categories.get(transaction.category) ?? 0) + 1,
    );
    history.set(matchKey, categories);
  }

  return history;
}

export function resolveUnambiguousHistoricalCategory(
  history: CategoryHistoryIndex,
  matchKey: string | null,
  activeCategories: readonly string[],
): HistoricalCategorySuggestion | null {
  if (!matchKey) return null;

  const categories = history.get(matchKey);
  if (!categories || categories.size !== 1) return null;

  const [[category, matchCount]] = categories.entries();
  const active = new Set(
    activeCategories.filter((candidate) => candidate !== 'Uncategorized'),
  );

  if (!active.has(category)) return null;
  return { category, matchCount };
}
