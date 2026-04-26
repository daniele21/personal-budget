import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  ChevronDown,
  Check,
  CheckSquare,
  Download,
  Filter,
  Pencil,
  Search,
  SlidersHorizontal,
  Paperclip,
  Square,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from '../components/CategoryIcon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SwipeableRow } from '../components/SwipeableRow';
import { TransactionQuickEditDialog } from '../components/TransactionQuickEditDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { Button, EmptyState, Input } from '../components/ui';
import { Transaction } from '../types';
import * as Finance from '../domain/finance';
import { haptics } from '../utils/haptics';
import { upsertRecurringOverride } from '../domain/recurring';

type PeriodPreset = 'current-month' | 'last-month' | '3-months' | 'all' | 'custom';
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

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
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="relative z-10 max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:max-h-[min(80vh,48rem)]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">History controls</p>
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
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<Finance.TransactionSortKey>('date');
  const [sortDirection, setSortDirection] = useState<Finance.SortDirection>('desc');
  const [startDate, setStartDate] = useState(formatDateInputValue(currentMonthRange.start));
  const [endDate, setEndDate] = useState(formatDateInputValue(currentMonthRange.end));
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('current-month');
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quickEditTransaction, setQuickEditTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchCategory, setBatchCategory] = useState(appCategories[0] ?? '');

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

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const clearSelection = () => setSelectedIds([]);

  const deleteSelected = () => {
    const deleted = transactions.filter((transaction) => selectedIds.includes(transaction.id));
    setTransactions(transactions.filter((transaction) => !selectedIds.includes(transaction.id)));
    setSelectedIds([]);
    haptics.warning();
    toast(`${deleted.length} transactions deleted`, 'info', 5000, {
      label: 'Undo',
      onClick: () => {
        setTransactions([...deleted, ...transactions.filter((transaction) => !selectedIds.includes(transaction.id))]);
        haptics.success();
      },
    });
  };

  const changeSelectedCategory = () => {
    if (!batchCategory) return;
    setTransactions(transactions.map((transaction) => (
      selectedIds.includes(transaction.id) ? { ...transaction, category: batchCategory } : transaction
    )));
    setSelectedIds([]);
    toast('Category updated for selected transactions', 'success');
  };

  const exportSelected = () => {
    const selected = transactions.filter((transaction) => selectedIds.includes(transaction.id));
    const header = ['id', 'amount', 'type', 'category', 'date', 'title', 'description', 'paymentMethod'];
    const rows = selected.map((transaction) => header.map((key) => JSON.stringify(transaction[key as keyof Transaction] ?? '')).join(','));
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aura_selected_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Selected transactions exported', 'success');
  };

  const rangeStart = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate]);
  const rangeEnd = useMemo(() => new Date(`${endDate}T23:59:59.999`), [endDate]);

  const filteredTransactions = useMemo(() => {
    const periodTransactions = Finance.filterByDateRange(transactions, rangeStart, rangeEnd);

    const searchFilteredTransactions = periodTransactions.filter(t => {
      const normalizedSearch = search.toLowerCase();
      const matchesSearch = (
        t.title?.toLowerCase().includes(normalizedSearch) ||
        t.description?.toLowerCase().includes(normalizedSearch) ||
        t.category.toLowerCase().includes(normalizedSearch)
      );
      const matchesFilter = selectedCategories.length === 0 || selectedCategories.includes(t.category);

      return matchesSearch && matchesFilter;
    });

    return Finance.sortTransactions(searchFilteredTransactions, sortKey, sortDirection);
  }, [transactions, rangeStart, rangeEnd, search, selectedCategories, sortKey, sortDirection]);

  const categories = useMemo(
    () => Array.from(new Set(transactions.map(t => t.category))).sort((left, right) => left.localeCompare(right)),
    [transactions],
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
    selectedCategories.length > 0 ||
    sortKey !== 'date' ||
    sortDirection !== 'desc' ||
    periodPreset !== 'current-month'
  );

  const chartData = useMemo(() => Finance
    .sortTransactions(filteredTransactions, 'date', 'asc')
    .reduce((acc: { date: string; balance: number }[], t) => {
      const date = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const newBalance = t.type === 'income' ? lastBalance + t.amount : lastBalance - t.amount;
      
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.balance = newBalance;
      } else {
        acc.push({ date, balance: newBalance });
      }
      return acc;
    }, []), [filteredTransactions]);

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
    setSelectedCategories([]);
    setSortKey('date');
    setSortDirection('desc');
    setPeriodPreset('current-month');
    setStartDate(formatDateInputValue(currentMonthRange.start));
    setEndDate(formatDateInputValue(currentMonthRange.end));
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

    return chips;
  }, [applyPeriodPreset, applySortOption, categoriesLabel, periodLabel, search, selectedCategories.length, sortLabel, sortOption]);

  const resultsLabel = `${filteredTransactions.length} ${filteredTransactions.length === 1 ? 'entry' : 'entries'}`;
  const hasBaseTransactions = transactions.length > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4 pb-24"
    >
      <section className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Financial Trajectory</h3>
          <TrendingUp className="w-4 h-4 text-secondary" />
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }} 
                minTickGap={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface-container-high)', 
                  border: 'none', 
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: 'var(--color-primary)' }}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="var(--color-primary)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-on-surface-variant/50" />
          </div>
          <input 
            className="w-full bg-surface-container-highest border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50 transition-all text-sm" 
            placeholder="Search transactions..." 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFiltersSheetOpen(true)}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition-all',
              selectedCategories.length > 0 || periodPreset !== 'current-month'
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant/10 bg-surface-container-lowest text-on-surface',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => setIsSortSheetOpen(true)}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition-all',
              sortOption !== 'date-desc'
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant/10 bg-surface-container-lowest text-on-surface',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Sort: {sortLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
          {hasNonDefaultFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-outline-variant/10 bg-surface-container-lowest px-4 py-2 text-xs font-bold text-on-surface-variant shadow-sm transition-all"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
        <div className="space-y-2 px-1">
          {activeChips.length > 0 ? (
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
          ) : (
            <p className="text-xs font-semibold text-on-surface-variant">
              Active: {periodLabel} · {categoriesLabel}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-on-surface-variant">{resultsLabel}</p>
            <p className="text-xs font-medium text-on-surface-variant">Sorted by {sortLabel.toLowerCase()}</p>
          </div>
        </div>
      </section>

      {selectedIds.length > 0 && (
        <section className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-primary">{selectedIds.length} selected</p>
              <p className="text-xs text-on-surface-variant">Batch edit, export, or delete selected transactions.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={batchCategory}
                onChange={(event) => setBatchCategory(event.target.value)}
                className="min-h-10 rounded-xl border-none bg-surface-container-lowest px-3 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary"
                aria-label="Batch category"
              >
                {appCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={changeSelectedCategory}>Change category</Button>
              <Button size="sm" variant="secondary" onClick={exportSelected}>
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
              <Button size="sm" variant="danger" onClick={deleteSelected}>Delete</Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-headline font-extrabold text-lg">Transaction History</h3>
          </div>
          <div className="space-y-2">
            {filteredTransactions.length > 0 ? filteredTransactions.map((t, index) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.025 }}
              >
                <SwipeableRow onEdit={() => setQuickEditTransaction(t)} onDelete={() => setDeleteId(t.id)}>
                  <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl transition-colors border border-outline-variant/5">
                    <button
                      type="button"
                      onClick={() => toggleSelected(t.id)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        toggleSelected(t.id);
                      }}
                      className="mr-3 rounded-xl p-1.5 text-primary hover:bg-primary/10"
                      aria-label={selectedIds.includes(t.id) ? `Deselect ${t.title || t.category}` : `Select ${t.title || t.category}`}
                    >
                      {selectedIds.includes(t.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                        <CategoryIcon category={t.category} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-on-surface truncate">{t.title}</h4>
                        <p className="text-xs font-medium text-on-surface-variant line-clamp-1">{t.description}</p>
                        <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">{new Date(t.date).toLocaleDateString()} • {t.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <div className="flex flex-col items-end">
                        <p className={cn("text-sm font-extrabold", t.type === 'income' ? "text-secondary" : "text-on-surface")}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                        {t.attachmentUrl && <Paperclip className="w-3 h-3 text-primary/40 mt-1" />}
                      </div>
                      <button
                        onClick={() => setQuickEditTransaction(t)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all"
                        aria-label={`Quick edit transaction ${t.title || t.category}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="p-2 text-tertiary hover:bg-tertiary/10 rounded-full transition-all"
                        aria-label={`Delete transaction ${t.title || t.category}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </SwipeableRow>
              </motion.div>
            )) : (
              <div className="rounded-3xl bg-surface-container-low border border-dashed border-outline-variant/20">
                <EmptyState
                  icon={hasBaseTransactions ? <Search className="w-10 h-10" /> : <Wallet className="w-10 h-10" />}
                  title={hasBaseTransactions ? 'No transactions match the filters' : 'No transactions yet'}
                  description={hasBaseTransactions ? 'Adjust search, categories, period, or sort to broaden the list.' : 'Add your first transaction to start building history.'}
                  action={hasBaseTransactions ? undefined : { label: 'Add transaction', to: '/add' }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

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
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Category</p>
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
                      <span className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl text-primary',
                        active ? 'bg-primary/15' : 'bg-surface-container-high',
                      )}>
                        <CategoryIcon category={category} className="h-4 w-4" />
                      </span>
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Period</p>
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

      <FilterSheet
        isOpen={isSortSheetOpen}
        title="Sort"
        subtitle="Choose the ordering that matches the question you are asking of the history list."
        onClose={() => setIsSortSheetOpen(false)}
      >
        <div className="space-y-4">
          {[
            {
              key: 'date-desc' as const,
              label: 'Newest first',
              icon: ArrowDown,
              description: 'Most recent transactions at the top.',
            },
            {
              key: 'date-asc' as const,
              label: 'Oldest first',
              icon: ArrowUp,
              description: 'Start from the oldest transaction.',
            },
            {
              key: 'amount-desc' as const,
              label: 'Highest amount',
              icon: ArrowDown,
              description: 'Largest amounts first.',
            },
            {
              key: 'amount-asc' as const,
              label: 'Lowest amount',
              icon: ArrowUp,
              description: 'Smallest amounts first.',
            },
          ].map((option) => {
            const active = sortOption === option.key;
            const Icon = option.icon;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  applySortOption(option.key);
                  setIsSortSheetOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all',
                  active
                    ? 'border-primary bg-primary/10 text-on-surface'
                    : 'border-outline-variant/10 bg-surface-container-low text-on-surface',
                )}
              >
                <span className="flex items-start gap-3">
                  <span className={cn(
                    'mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl',
                    active ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-primary',
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className="mt-1 block text-xs text-on-surface-variant">{option.description}</span>
                  </span>
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
      </FilterSheet>
    </motion.div>
  );
};
