import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  Check,
  Filter,
  Pencil,
  Search,
  SlidersHorizontal,
  Paperclip,
  Trash2,
  TrendingUp,
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
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { Input } from '../components/ui/Input';
import { Transaction } from '../types';
import * as Finance from '../domain/finance';

type PeriodPreset = 'current-month' | 'last-month' | '3-months' | 'all' | 'custom';

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
          className="fixed inset-0 z-[170] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
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
            className="relative z-10 w-full max-w-lg rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">History filters</p>
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { transactions, deleteTransaction: ctxDeleteTransaction } = useApp();
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
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteTransaction = (id: string) => {
    ctxDeleteTransaction(id);
    setDeleteId(null);
    toast('Transaction deleted', 'info');
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

  const hasNonDefaultFilters = (
    search.trim().length > 0 ||
    selectedCategories.length > 0 ||
    sortKey !== 'date' ||
    sortDirection !== 'desc' ||
    periodPreset !== 'current-month'
  );

  const activePills = useMemo(() => {
    const pills: string[] = [];
    if (selectedCategories.length > 0) pills.push(categoriesLabel);
    pills.push(periodLabel);
    pills.push(`${sortKey === 'date' ? 'Date' : 'Amount'} ${sortDirection === 'desc' ? '↓' : '↑'}`);
    return pills;
  }, [categoriesLabel, periodLabel, selectedCategories.length, sortKey, sortDirection]);

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

  const toggleSortKey = () => {
    setSortKey((current) => current === 'date' ? 'amount' : 'date');
  };

  const toggleSortDirection = () => {
    setSortDirection((current) => current === 'desc' ? 'asc' : 'desc');
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
            onClick={() => setIsCategoryMenuOpen(true)}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition-all',
              selectedCategories.length > 0
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant/10 bg-surface-container-lowest text-on-surface',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{categoriesLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPeriodSheetOpen(true)}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition-all',
              periodPreset !== 'current-month'
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline-variant/10 bg-surface-container-lowest text-on-surface',
            )}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            <span>{periodLabel}</span>
          </button>
          <button
            type="button"
            onClick={toggleSortKey}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-outline-variant/10 bg-surface-container-lowest px-4 py-2 text-xs font-bold text-on-surface shadow-sm transition-all"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>{sortKey === 'date' ? 'Date' : 'Amount'}</span>
          </button>
          <button
            type="button"
            onClick={toggleSortDirection}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-outline-variant/10 bg-surface-container-lowest text-on-surface shadow-sm transition-all"
            aria-label={sortDirection === 'desc' ? 'Sort descending' : 'Sort ascending'}
            title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
          >
            {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4 text-primary" /> : <ArrowUp className="h-4 w-4 text-primary" />}
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
        <div className="flex flex-wrap items-center gap-2 px-1">
          {activePills.map((pill) => (
            <span
              key={pill}
              className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-bold text-on-surface-variant"
            >
              {pill}
            </span>
          ))}
          {search.trim().length > 0 && (
            <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-bold text-on-surface-variant">
              Search: {search.trim()}
            </span>
          )}
        </div>
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">View</p>
              <p className="mt-1 text-sm font-bold text-on-surface">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'} in {periodLabel}
              </p>
            </div>
            <div className="text-right text-xs font-medium text-on-surface-variant">
              Sorted by {sortKey === 'date' ? 'date' : 'amount'} {sortDirection === 'desc' ? 'descending' : 'ascending'}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-headline font-extrabold text-lg">Transaction History</h3>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{filteredTransactions.length} entries</span>
          </div>
          <div className="space-y-2">
            {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl transition-colors border border-outline-variant/5">
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
                    onClick={() => navigate(`/edit/${t.id}`)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all"
                    aria-label="Edit transaction"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(t.id)}
                    className="p-2 text-tertiary hover:bg-tertiary/10 rounded-full transition-all"
                    aria-label="Delete transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/20">
                <Search className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
                <p className="text-sm text-on-surface-variant font-medium">No transactions found</p>
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

      <FilterSheet
        isOpen={isCategoryMenuOpen}
        title="Categories"
        subtitle="Select one or more categories to narrow the history list."
        onClose={() => setIsCategoryMenuOpen(false)}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {categories.map((category) => {
              const active = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all',
                    active
                      ? 'border-primary bg-primary/10 text-on-surface'
                      : 'border-outline-variant/10 bg-surface-container-low text-on-surface',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-high text-primary">
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
      </FilterSheet>

      <FilterSheet
        isOpen={isPeriodSheetOpen}
        title="Period"
        subtitle="Use a quick preset for speed, or switch to a custom range."
        onClose={() => setIsPeriodSheetOpen(false)}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
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
          <div className="rounded-2xl bg-surface-container-low p-4">
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Custom range</p>
              <p className="mt-1 text-xs text-on-surface-variant">Set explicit start and end dates. This will switch the period to custom.</p>
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
        </div>
      </FilterSheet>
    </motion.div>
  );
};
