import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X, Clock, CreditCard, RefreshCw, PieChart, Target, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchEntity, SearchResult } from '../domain/search';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { formatCurrency, formatDate } from '../utils/formatters';
import { cn } from '../lib/utils';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const ENTITY_LABELS: Record<SearchEntity, string> = {
  transaction: 'Transactions',
  recurring: 'Recurring',
  budget: 'Budgets',
  goal: 'Goals',
  category: 'Categories',
};

const ENTITY_ICONS: Record<SearchEntity, React.ReactNode> = {
  transaction: <CreditCard className="w-4 h-4" />,
  recurring: <RefreshCw className="w-4 h-4" />,
  budget: <PieChart className="w-4 h-4" />,
  goal: <Target className="w-4 h-4" />,
  category: <Tag className="w-4 h-4" />,
};

function ResultRow({ result, onSelect }: { result: SearchResult; onSelect: (result: SearchResult) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container-low transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {ENTITY_ICONS[result.entity]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-on-surface truncate">{result.title}</p>
        <p className="text-micro text-on-surface-variant truncate">
          {result.subtitle}{result.date ? ` · ${formatDate(result.date)}` : ''}
        </p>
      </div>
      {typeof result.amount === 'number' && (
        <p className={cn('text-sm font-bold', result.amount >= 0 ? 'text-secondary' : 'text-tertiary')}>
          {result.amount >= 0 ? '' : '-'}{formatCurrency(Math.abs(result.amount))}
        </p>
      )}
    </button>
  );
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, grouped, results, recentSearches, rememberSearch, clearRecentSearches } = useGlobalSearch();
  useFocusTrap(dialogRef, isOpen, onClose);

  const handleSelect = (result: SearchResult) => {
    rememberSearch(query || result.title);
    navigate(result.route);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Enter' && results[0]) {
        event.preventDefault();
        handleSelect(results[0]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, results]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[180] bg-surface/80 backdrop-blur-xl px-4 pt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
            className="mx-auto max-w-2xl rounded-3xl border border-outline-variant/10 bg-surface-container-lowest shadow-2xl overflow-hidden"
            initial={{ y: 18, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 18, scale: 0.98 }}
          >
            <div className="flex items-center gap-3 border-b border-outline-variant/10 px-4 py-3">
              <Search className="w-5 h-5 text-primary shrink-0" />
              <h2 id="global-search-title" className="sr-only">Global search</h2>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search transactions, budgets, recurring, goals..."
                className="min-h-11 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
              />
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-surface-container-high flex items-center justify-center"
                aria-label="Close search"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-3">
              {!query.trim() && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-micro font-bold text-on-surface-variant">Recent searches</p>
                    {recentSearches.length > 0 && (
                      <button type="button" onClick={clearRecentSearches} className="text-micro font-bold text-primary">
                        Clear
                      </button>
                    )}
                  </div>
                  {recentSearches.length === 0 ? (
                    <p className="px-2 py-8 text-center text-sm text-on-surface-variant">No recent searches yet.</p>
                  ) : recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container-low text-left"
                    >
                      <Clock className="w-4 h-4 text-on-surface-variant" />
                      <span className="text-sm font-medium text-on-surface">{item}</span>
                    </button>
                  ))}
                </div>
              )}

              {query.trim() && results.length === 0 && (
                <p className="px-2 py-10 text-center text-sm text-on-surface-variant">No results for “{query}”.</p>
              )}

              {query.trim() && results.length > 0 && (
                <div className="space-y-5">
                  {(Object.keys(grouped) as SearchEntity[]).map((entity) => {
                    const items = grouped[entity];
                    if (items.length === 0) return null;
                    return (
                      <section key={entity} className="space-y-1">
                        <p className="px-2 text-micro font-bold text-on-surface-variant">
                          {ENTITY_LABELS[entity]}
                        </p>
                        {items.map((result) => (
                          <div key={result.id}>
                            <ResultRow result={result} onSelect={handleSelect} />
                          </div>
                        ))}
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
