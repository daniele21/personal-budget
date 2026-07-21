import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarRange,
  ChevronDown,
  Check,
  Filter,
  Search,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TransactionQuickEditDialog } from '../components/TransactionQuickEditDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { Button, Input, SegmentedControl } from '../components/ui';
import { Transaction } from '../types';
import * as Finance from '../domain/finance';
import { haptics } from '../utils/haptics';
import { upsertRecurringOverride } from '../domain/recurring';
import { TransactionHistoryList } from '../components/history/TransactionHistoryList';
import { ImportWizardDialog } from '../components/import/ImportWizardDialog';
import { slidePageTransition } from '../utils/motion';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { TransactionDetailSheet } from '../components/transactions/TransactionDetailSheet';
import { useLocation } from 'react-router-dom';

type PeriodPreset = 'current-month' | 'last-month' | '3-months' | 'all' | 'custom';
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type TransactionTypeFilter = 'all' | 'income' | 'expense';

function formatDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getCurrentMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
}

function getLastMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 0),
  };
}

function getLastThreeMonthsRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
}

function getAllTimeRange(transactions: Transaction[]) {
  if (transactions.length === 0) {
    return getCurrentMonthRange();
  }

  const sorted = Finance.sortTransactions(transactions, 'date', 'asc');
  return {
    start: new Date(sorted[0].date),
    end: new Date(sorted[sorted.length - 1].date),
  };
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function FilterSheet({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[170] flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 cursor-default"
            onClick={onClose}
            aria-label={`Close ${title}`}
          />
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="relative z-10 max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:max-h-[min(80vh,48rem)]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-micro font-bold text-primary">History controls</p>
                <h3 className="font-headline text-xl font-extrabold text-on-surface">{title}</h3>
                {subtitle && <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high"
                aria-label={`Close ${title}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export const HistoryPage = () => {
  const { toast } = useToast();
  const {
    transactions,
    setTransactions,
    deleteTransaction: ctxDeleteTransaction,
    categories: appCategories,
    addCategory,
    recurring,
    setRecurring,
  } = useApp();
  const currentMonthRange = useMemo(() => getCurrentMonthRange(), []);
  const lastMonthRange = useMemo(() => getLastMonthRange(), []);
  const lastThreeMonthsRange = useMemo(() => getLastThreeMonthsRange(), []);
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get('category');
    return cat ? [cat] : [];
  });
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionTypeFilter>(() => {
    const t = searchParams.get('type');
    return (t === 'income' || t === 'expense') ? t : 'all';
  });
  const [sortKey, setSortKey] = useState<Finance.TransactionSortKey>('date');
  const [sortDirection, setSortDirection] = useState<Finance.SortDirection>('desc');
  const [startDate, setStartDate] = useState(() => {
    const startStr = searchParams.get('startDate');
    return startStr || formatDateInputValue(currentMonthRange.start);
  });
  const [endDate, setEndDate] = useState(() => {
    const endStr = searchParams.get('endDate');
    return endStr || formatDateInputValue(currentMonthRange.end);
  });
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(() => {
    const presetStr = searchParams.get('preset') as PeriodPreset | null;
    if (searchParams.has('startDate') && searchParams.has('endDate')) {
      return presetStr || 'custom';
    }
    return 'current-month';
  });
  const [lens, setLens] = useState<'actual' | 'normalized'>(() => {
    const l = searchParams.get('lens');
    return (l === 'normalized' || l === 'actual') ? l : 'actual';
  });
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [quickEditTransaction, setQuickEditTransaction] = useState<Transaction | null>(null);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    const category = params.get('category');
    if (category) {
      setSelectedCategories([category]);
    }
    
    const startStr = params.get('startDate');
    const endStr = params.get('endDate');
    const presetStr = params.get('preset') as PeriodPreset | null;
    if (startStr && endStr) {
      setStartDate(startStr);
      setEndDate(endStr);
      setPeriodPreset(presetStr || 'custom');
    }
    
    const lensStr = params.get('lens');
    if (lensStr === 'normalized' || lensStr === 'actual') {
      setLens(lensStr);
    }

    const typeStr = params.get('type');
    if (typeStr === 'income' || typeStr === 'expense') {
      setTransactionTypeFilter(typeStr);
    } else {
      setTransactionTypeFilter('all');
    }

    if (params.get('import') === '1') setIsImportWizardOpen(true);
  }, [location.search]);

  const deleteTransaction = (id: string) => {
    const deleted = transactions.find((transaction) => transaction.id === id);
    ctxDeleteTransaction(id);
    setDeleteId(null);
    haptics.warning();
    toast('Transaction deleted', 'info', 5000, deleted ? {
      label: 'Undo',
      onClick: () => {
        setTransactions([deleted, ...transactions]);
        haptics.success();
      },
    } : undefined);
  };

  const saveQuickEdit = (nextTransaction: Transaction) => {
    const existingTransaction = transactions.find((transaction) => transaction.id === nextTransaction.id);
    setTransactions(transactions.map((transaction) => (
      transaction.id === nextTransaction.id ? nextTransaction : transaction
    )));

    if (existingTransaction?.sourceRecurringId && existingTransaction.sourceMonthKey) {
      setRecurring(recurring.map((bill) => (
        bill.id === existingTransaction.sourceRecurringId
          ? upsertRecurringOverride(bill, {
            monthKey: existingTransaction.sourceMonthKey,
            occurrenceKey: existingTransaction.sourceMonthKey,
            amount: nextTransaction.amount,
            type: nextTransaction.type,
            category: nextTransaction.category,
            title: nextTransaction.title,
            description: nextTransaction.description,
            paymentMethod: nextTransaction.paymentMethod,
            date: nextTransaction.date,
          })
          : bill
      )));
    }

    setQuickEditTransaction(null);
    haptics.success();
    toast('Transaction updated', 'success');
  };



  const rangeStart = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate]);
  const rangeEnd = useMemo(() => new Date(`${endDate}T23:59:59.999`), [endDate]);

  const filteredTransactions = useMemo(() => {
    const lensTransactions = Finance.filterByAnalyticsLens(transactions, lens);
    const periodTransactions = Finance.filterByDateRange(lensTransactions, rangeStart, rangeEnd);

    const searchFilteredTransactions = periodTransactions.filter(t => {
      const normalizedSearch = search.toLowerCase();
      const matchesSearch = (
        t.title?.toLowerCase().includes(normalizedSearch) ||
        t.description?.toLowerCase().includes(normalizedSearch) ||
        t.category.toLowerCase().includes(normalizedSearch)
      );
      const matchesFilter = selectedCategories.length === 0 || selectedCategories.includes(t.category);
      const matchesType = transactionTypeFilter === 'all' || t.type === transactionTypeFilter;

      return matchesSearch && matchesFilter && matchesType;
    });

    return Finance.sortTransactions(searchFilteredTransactions, sortKey, sortDirection);
  }, [transactions, lens, rangeStart, rangeEnd, search, selectedCategories, transactionTypeFilter, sortKey, sortDirection]);

  const categories = useMemo(
    () => {
      const lensTransactions = Finance.filterByAnalyticsLens(transactions, lens);
      return Array.from(new Set(lensTransactions.map(t => t.category))).sort((left, right) => left.localeCompare(right));
    },
    [transactions, lens],
  );

  const allTimeRange = useMemo(() => getAllTimeRange(transactions), [transactions]);

  const periodLabel = useMemo(() => {
    if (periodPreset === 'current-month') return 'This month';
    if (periodPreset === 'last-month') return 'Last month';
    if (periodPreset === '3-months') return 'Last 3 months';
    if (periodPreset === 'all') return 'All time';
    return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
  }, [periodPreset, startDate, endDate]);

  const categoriesLabel = useMemo(() => {
    if (selectedCategories.length === 0) return 'All categories';
    if (selectedCategories.length === 1) return selectedCategories[0];
    return `${selectedCategories.length} categories`;
  }, [selectedCategories]);

  const sortOption = useMemo<SortOption>(() => {
    if (sortKey === 'date' && sortDirection === 'desc') return 'date-desc';
    if (sortKey === 'date' && sortDirection === 'asc') return 'date-asc';
    if (sortKey === 'amount' && sortDirection === 'desc') return 'amount-desc';
    return 'amount-asc';
  }, [sortDirection, sortKey]);

  const sortLabel = useMemo(() => {
    switch (sortOption) {
      case 'date-desc':
        return 'Newest';
      case 'date-asc':
        return 'Oldest';
      case 'amount-desc':
        return 'Highest amount';
      case 'amount-asc':
        return 'Lowest amount';
      default:
        return 'Newest';
    }
  }, [sortOption]);

  const hasNonDefaultFilters = (
    search.trim().length > 0 ||
    transactionTypeFilter !== 'all' ||
    selectedCategories.length > 0 ||
    sortKey !== 'date' ||
    sortDirection !== 'desc' ||
    periodPreset !== 'current-month'
  );

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) => (
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    ));
  };

  const applyPeriodPreset = (preset: PeriodPreset) => {
    const nextRange = (
      preset === 'current-month' ? currentMonthRange :
      preset === 'last-month' ? lastMonthRange :
      preset === '3-months' ? lastThreeMonthsRange :
      preset === 'all' ? allTimeRange :
      { start: new Date(`${startDate}T00:00:00`), end: new Date(`${endDate}T00:00:00`) }
    );

    setPeriodPreset(preset);
    setStartDate(formatDateInputValue(nextRange.start));
    setEndDate(formatDateInputValue(nextRange.end));
  };

  const applySortOption = (option: SortOption) => {
    switch (option) {
      case 'date-desc':
        setSortKey('date');
        setSortDirection('desc');
        break;
      case 'date-asc':
        setSortKey('date');
        setSortDirection('asc');
        break;
      case 'amount-desc':
        setSortKey('amount');
        setSortDirection('desc');
        break;
      case 'amount-asc':
        setSortKey('amount');
        setSortDirection('asc');
        break;
    }
  };

  const resetFilters = () => {
    setSearch('');
    setTransactionTypeFilter('all');
    setSelectedCategories([]);
    setSortKey('date');
    setSortDirection('desc');
    setPeriodPreset('current-month');
    setStartDate(formatDateInputValue(currentMonthRange.start));
    setEndDate(formatDateInputValue(currentMonthRange.end));
    setLens('actual');
  };

  useEffect(() => {
    if (periodPreset !== 'custom') return;

    const matchesCurrentMonth = (
      isSameDay(rangeStart, currentMonthRange.start) &&
      isSameDay(rangeEnd, currentMonthRange.end)
    );
    const matchesLastMonth = (
      isSameDay(rangeStart, lastMonthRange.start) &&
      isSameDay(rangeEnd, lastMonthRange.end)
    );
    const matchesLastThreeMonths = (
      isSameDay(rangeStart, lastThreeMonthsRange.start) &&
      isSameDay(rangeEnd, lastThreeMonthsRange.end)
    );
    const matchesAllTime = (
      isSameDay(rangeStart, allTimeRange.start) &&
      isSameDay(rangeEnd, allTimeRange.end)
    );

    if (matchesCurrentMonth) setPeriodPreset('current-month');
    else if (matchesLastMonth) setPeriodPreset('last-month');
    else if (matchesLastThreeMonths) setPeriodPreset('3-months');
    else if (matchesAllTime) setPeriodPreset('all');
  }, [periodPreset, rangeStart, rangeEnd, currentMonthRange, lastMonthRange, lastThreeMonthsRange, allTimeRange]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (search.trim().length > 0) {
      chips.push({
        key: 'search',
        label: `Search: ${search.trim()}`,
        onRemove: () => setSearch(''),
      });
    }

    if (selectedCategories.length > 0) {
      chips.push({
        key: 'categories',
        label: categoriesLabel,
        onRemove: () => setSelectedCategories([]),
      });
    }

    if (transactionTypeFilter !== 'all') {
      chips.push({
        key: 'type',
        label: transactionTypeFilter === 'income' ? 'Income' : 'Expenses',
        onRemove: () => setTransactionTypeFilter('all'),
      });
    }

    if (periodPreset !== 'current-month') {
      chips.push({
        key: 'period',
        label: periodLabel,
        onRemove: () => applyPeriodPreset('current-month'),
      });
    }

    if (sortOption !== 'date-desc') {
      chips.push({
        key: 'sort',
        label: `Sort: ${sortLabel}`,
        onRemove: () => applySortOption('date-desc'),
      });
    }

    if (lens !== 'actual') {
      chips.push({
        key: 'lens',
        label: 'Net of extras',
        onRemove: () => setLens('actual'),
      });
    }

    return chips;
  }, [applyPeriodPreset, applySortOption, categoriesLabel, periodLabel, search, selectedCategories.length, sortLabel, sortOption, transactionTypeFilter, lens, setLens]);

  const resultsLabel = `${filteredTransactions.length} ${filteredTransactions.length === 1 ? 'entry' : 'entries'}`;
  const hasBaseTransactions = transactions.length > 0;

  return (
    <motion.div 
      {...slidePageTransition}
      className="space-y-4 pb-24"
    >
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <SegmentedControl
            ariaLabel="Transaction type filter"
            value={transactionTypeFilter}
            onChange={setTransactionTypeFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expenses' },
            ]}
            size="compact"
          />
          <div className="flex items-center gap-1.5">
            {hasNonDefaultFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-outline-variant/10 bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-on-surface-variant shadow-sm transition-all hover:bg-error/10 hover:text-error"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-grow group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-on-surface-variant/50" />
            </div>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-full h-11 pl-10 pr-3 focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50 transition-all text-sm"
              placeholder="Search transactions"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFiltersSheetOpen(true)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm transition-all',
              selectedCategories.length > 0 || periodPreset !== 'current-month'
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant/10 bg-surface-container-lowest text-on-surface',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
        </div>
        <div className="space-y-2 px-1">
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high"
                >
                  <span>{chip.label}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
          {hasNonDefaultFilters && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-on-surface-variant">{resultsLabel}</p>
              <p className="text-xs font-medium text-on-surface-variant">Sorted by {sortLabel.toLowerCase()}</p>
            </div>
          )}
        </div>
      </section>

      <TransactionHistoryList
        transactions={filteredTransactions}
        hasBaseTransactions={hasBaseTransactions}
        onOpenDetails={setDetailTransaction}
        onQuickEdit={setQuickEditTransaction}
        onDelete={setDeleteId}
        sortKey={sortKey}
      />

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && deleteTransaction(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      <TransactionQuickEditDialog
        transaction={quickEditTransaction}
        categories={appCategories}
        onAddCategory={addCategory}
        onClose={() => setQuickEditTransaction(null)}
        onSave={saveQuickEdit}
        onDelete={(id) => {
          setQuickEditTransaction(null);
          setDeleteId(id);
        }}
      />

      <TransactionDetailSheet
        transaction={detailTransaction}
        onClose={() => setDetailTransaction(null)}
        onEdit={(transaction) => {
          setDetailTransaction(null);
          setQuickEditTransaction(transaction);
        }}
        onDelete={(id) => {
          setDetailTransaction(null);
          setDeleteId(id);
        }}
      />

      <ImportWizardDialog
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
      />

      <FilterSheet
        isOpen={isFiltersSheetOpen}
        title="Filters"
        subtitle="Refine the history list by category and period without taking over the main screen."
        onClose={() => setIsFiltersSheetOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-3">
              <p className="text-micro font-bold text-on-surface-variant">Category</p>
              <p className="mt-1 text-xs text-on-surface-variant">Pick one or more categories, or leave all visible.</p>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-bold transition-all',
                  selectedCategories.length === 0
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant',
                )}
              >
                All categories
              </button>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="rounded-full bg-surface-container-high px-4 py-2 text-xs font-bold text-on-surface-variant transition-all"
                >
                  Clear selection
                </button>
              )}
            </div>
            <div className="max-h-[32vh] overflow-y-auto rounded-2xl border border-outline-variant/10 bg-surface-container-low pr-1">
              {categories.map((category) => {
                const active = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-3 text-left transition-all',
                      active
                        ? 'bg-primary/10 text-on-surface'
                        : 'text-on-surface hover:bg-surface-container-high',
                    )}
                  >
                    <span className="flex items-center gap-3">
                        <CategoryBadge category={category} size="sm" />
                      <span className="text-sm font-bold">{category}</span>
                    </span>
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border',
                      active ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant/20',
                    )}>
                      {active && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-4">
            <div className="mb-3">
              <p className="text-micro font-bold text-on-surface-variant">Period</p>
              <p className="mt-1 text-xs text-on-surface-variant">Start from a quick preset, or switch to a custom date range.</p>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { key: 'current-month', label: 'This month' },
                { key: 'last-month', label: 'Last month' },
                { key: '3-months', label: 'Last 3 months' },
                { key: 'all', label: 'All time' },
              ].map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPeriodPreset(preset.key as PeriodPreset)}
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-bold transition-all',
                    periodPreset === preset.key
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="From"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodPreset('custom');
                }}
              />
              <Input
                label="To"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodPreset('custom');
                }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-4">
            <div className="mb-3">
              <p className="text-micro font-bold text-on-surface-variant">Sort</p>
              <p className="mt-1 text-xs text-on-surface-variant">Choose how transactions are ordered.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'date-desc' as const, label: 'Newest' },
                { key: 'date-asc' as const, label: 'Oldest' },
                { key: 'amount-desc' as const, label: 'Highest amount' },
                { key: 'amount-asc' as const, label: 'Lowest amount' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={sortOption === option.key}
                  onClick={() => applySortOption(option.key)}
                  className={cn(
                    'min-h-10 rounded-xl px-3 py-2 text-xs font-bold transition-colors',
                    sortOption === option.key
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full px-4 py-2 text-xs font-bold text-on-surface-variant transition-all hover:bg-surface-container-high"
            >
              Reset filters
            </button>
            <button
              type="button"
              onClick={() => setIsFiltersSheetOpen(false)}
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary transition-all hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </FilterSheet>
    </motion.div>
  );
};
