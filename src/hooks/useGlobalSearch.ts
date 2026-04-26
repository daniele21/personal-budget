import { useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../data/storageKeys';
import { groupSearchResults, searchAura } from '../domain/search';
import { useApp } from '../context/AppContext';
import { useLocalStorage } from './useLocalStorage';

export function useGlobalSearch() {
  const { transactions, recurring, budgets, savingsGoals, categories } = useApp();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(STORAGE_KEYS.recentSearches, []);

  const results = useMemo(
    () => searchAura({ transactions, recurring, budgets, savingsGoals, categories }, query),
    [transactions, recurring, budgets, savingsGoals, categories, query],
  );

  const grouped = useMemo(() => groupSearchResults(results), [results]);

  const rememberSearch = (value = query) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecentSearches((current) => [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, 8));
  };

  const clearRecentSearches = () => setRecentSearches([]);

  return {
    query,
    setQuery,
    results,
    grouped,
    recentSearches,
    rememberSearch,
    clearRecentSearches,
  };
}
