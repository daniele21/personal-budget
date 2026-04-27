import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, BarChart3, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { Card } from '../components/ui';
import { cn } from '../lib/utils';
import { Transaction } from '../types';
import * as Finance from '../domain/finance';
import { pageTransition } from '../utils/motion';
import { getCategoryTheme } from '../config/categoryThemes';

// ─── Range definitions ──────────────────────────────────────────────

type RangeKey = '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '6M', label: '6M' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y', label: '1Y' },
  { key: 'ALL', label: 'All' },
];

function getDateRange(range: RangeKey, anchorYear: number, anchorMonth: number): { start: Date; end: Date; prevStart: Date; prevEnd: Date; label: string } {
  const end = new Date(anchorYear, anchorMonth + 1, 0, 23, 59, 59); // end of anchor month

  if (range === '1W') {
    const today = new Date();
    const anchor = anchorYear === today.getFullYear() && anchorMonth === today.getMonth()
      ? today
      : new Date(anchorYear, anchorMonth + 1, 0);
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const weekEnd = new Date(anchor);
    weekEnd.setHours(23, 59, 59, 999);
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);
    const label = `${start.toLocaleDateString('default', { day: 'numeric', month: 'short' })} — ${weekEnd.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    return { start, end: weekEnd, prevStart, prevEnd, label };
  }

  if (range === '1M') {
    const start = new Date(anchorYear, anchorMonth, 1);
    const prevEnd = new Date(anchorYear, anchorMonth, 0, 23, 59, 59);
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    const label = start.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { start, end, prevStart, prevEnd, label };
  }

  let months: number;
  let start: Date;
  if (range === '3M') { months = 3; start = new Date(anchorYear, anchorMonth - 2, 1); }
  else if (range === '6M') { months = 6; start = new Date(anchorYear, anchorMonth - 5, 1); }
  else if (range === '1Y') { months = 12; start = new Date(anchorYear, anchorMonth - 11, 1); }
  else if (range === 'YTD') {
    start = new Date(anchorYear, 0, 1);
    months = anchorMonth + 1;
  } else {
    // ALL
    start = new Date(2000, 0, 1);
    months = 0;
  }

  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = months > 0 ? new Date(start.getFullYear(), start.getMonth() - months, 1) : new Date(2000, 0, 1);

  let label: string;
  if (range === 'ALL') label = 'All Time';
  else if (range === 'YTD') label = `YTD ${anchorYear}`;
  else {
    const s = start.toLocaleString('default', { month: 'short', year: 'numeric' });
    const e = end.toLocaleString('default', { month: 'short', year: 'numeric' });
    label = `${s} — ${e}`;
  }

  return { start, end, prevStart, prevEnd, label };
}

function filterByRange(transactions: Transaction[], start: Date, end: Date): Transaction[] {
  return transactions.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
}

// ─── Colors ─────────────────────────────────────────────────────────

const BAR_COLORS = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-[#8b5cf6]', 'bg-[#f59e0b]', 'bg-[#06b6d4]', 'bg-[#ec4899]', 'bg-[#10b981]'];
const TEXT_COLORS = ['text-primary', 'text-secondary', 'text-tertiary', 'text-[#8b5cf6]', 'text-[#f59e0b]', 'text-[#06b6d4]', 'text-[#ec4899]', 'text-[#10b981]'];

const DEEPER_ANALYSIS_LINKS = [
  {
    to: '/compare',
    label: 'Compare periods',
    ariaLabel: 'Open period comparison report',
    icon: BarChart3,
    iconClassName: 'bg-accent-cyan/10 text-accent-cyan',
  },
  {
    to: '/year-review',
    label: 'Year in Review',
    ariaLabel: 'Open year in review report',
    icon: Trophy,
    iconClassName: 'bg-accent-amber/10 text-accent-amber',
  },
];

// ─── Component ──────────────────────────────────────────────────────

export const InsightsPage = () => {
  const { transactions, budgets } = useApp();
  const today = new Date();
  const [anchorYear, setAnchorYear] = useState(today.getFullYear());
  const [anchorMonth, setAnchorMonth] = useState(today.getMonth());
  const [range, setRange] = useState<RangeKey>('1M');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const { start, end, prevStart, prevEnd, label: periodLabel } = useMemo(
    () => getDateRange(range, anchorYear, anchorMonth),
    [range, anchorYear, anchorMonth],
  );

  const periodTx = useMemo(() => filterByRange(transactions, start, end), [transactions, start, end]);
  const prevPeriodTx = useMemo(() => filterByRange(transactions, prevStart, prevEnd), [transactions, prevStart, prevEnd]);

  const totals = useMemo(() => Finance.calculateTotals(periodTx), [periodTx]);
  const prevTotals = useMemo(() => Finance.calculateTotals(prevPeriodTx), [prevPeriodTx]);

  // Spending by category
  const categorySpending = useMemo(() => {
    const expenses = Finance.filterByType(periodTx, 'expense');
    const cats = Array.from(new Set(expenses.map(t => t.category)));
    const total = expenses.reduce((s, t) => s + t.amount, 0);
    return cats.map(cat => {
      const amount = Finance.filterByCategory(expenses, cat).reduce((s, t) => s + t.amount, 0);
      return { category: cat, amount, percentage: total > 0 ? amount / total : 0 };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [periodTx]);

  // Income by category
  const categoryIncome = useMemo(() => {
    const incomes = Finance.filterByType(periodTx, 'income');
    const cats = Array.from(new Set(incomes.map(t => t.category)));
    const total = incomes.reduce((s, t) => s + t.amount, 0);
    return cats.map(cat => {
      const amount = Finance.filterByCategory(incomes, cat).reduce((s, t) => s + t.amount, 0);
      return { category: cat, amount, percentage: total > 0 ? amount / total : 0 };
    }).sort((a, b) => b.amount - a.amount);
  }, [periodTx]);

  // Merged category data
  const allCategories = useMemo(() => {
    const catSet = new Set([...categorySpending.map(c => c.category), ...categoryIncome.map(c => c.category)]);
    return Array.from(catSet).map(cat => {
      const expense = categorySpending.find(c => c.category === cat)?.amount || 0;
      const income = categoryIncome.find(c => c.category === cat)?.amount || 0;
      const budget = budgets.find(b => b.category === cat);

      const prevCatExpense = Finance.filterByCategory(Finance.filterByType(prevPeriodTx, 'expense'), cat).reduce((s, t) => s + t.amount, 0);
      const change = prevCatExpense > 0 ? ((expense - prevCatExpense) / prevCatExpense) * 100 : null;

      return { category: cat, expense, income, net: income - expense, budget, change };
    }).sort((a, b) => (b.expense + b.income) - (a.expense + a.income));
  }, [categorySpending, categoryIncome, budgets, prevPeriodTx]);

  // Navigation
  const goBack = () => {
    if (anchorMonth === 0) { setAnchorMonth(11); setAnchorYear(y => y - 1); }
    else setAnchorMonth(m => m - 1);
    setExpandedCat(null);
  };
  const goForward = () => {
    if (anchorMonth === 11) { setAnchorMonth(0); setAnchorYear(y => y + 1); }
    else setAnchorMonth(m => m + 1);
    setExpandedCat(null);
  };

  const expenseChange = prevTotals.expenses > 0
    ? ((totals.expenses - prevTotals.expenses) / prevTotals.expenses * 100)
    : null;

  // How many months in the range (for budget scaling)
  const rangeMonths = useMemo(() => {
    if (range === '1W') return 1;
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  }, [range, start, end]);

  return (
    <motion.div
      {...pageTransition}
      className="space-y-4 pb-24"
    >
      <section className="space-y-1">
        <p className="text-micro font-bold text-on-surface-variant">Reports</p>
        <h2 className="font-headline text-2xl font-extrabold text-primary">Weekly and monthly analysis</h2>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold text-on-surface-variant px-1">Deeper analysis</h3>
        <div className="grid grid-cols-2 gap-2">
          {DEEPER_ANALYSIS_LINKS.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.ariaLabel}
                className="flex min-h-14 items-center gap-2 rounded-2xl border border-outline-variant/5 bg-surface-container-lowest px-3 py-2 transition-all hover:bg-surface-container-low active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <span className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl', item.iconClassName)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 text-sm font-bold leading-tight text-on-surface">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Range selector */}
      <div className="flex items-center gap-1 bg-surface-container-high rounded-2xl p-1">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => { setRange(r.key); setExpandedCat(null); }}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              range === r.key ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Period nav (arrows shift the anchor month) */}
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="p-2 hover:bg-surface-container-low rounded-full transition-colors" aria-label="Previous period">
          <ChevronLeft className="w-5 h-5 text-primary" />
        </button>
        <h2 className="font-headline font-bold text-sm text-primary text-center">{periodLabel}</h2>
        <button onClick={goForward} className="p-2 hover:bg-surface-container-low rounded-full transition-colors" aria-label="Next period">
          <ChevronRight className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/5">
          <p className="text-micro text-on-surface-variant font-bold mb-1 uppercase tracking-wider">Income</p>
          <p className="text-lg font-headline font-bold text-secondary tabular-nums whitespace-nowrap">{formatCurrency(totals.income)}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/5">
          <p className="text-micro text-on-surface-variant font-bold mb-1 uppercase tracking-wider">Expenses</p>
          <p className="text-lg font-headline font-bold text-tertiary tabular-nums whitespace-nowrap">{formatCurrency(totals.expenses)}</p>
        </div>
      </div>

      <div className={cn(
        "rounded-3xl p-5 border border-outline-variant/5 flex items-center justify-between transition-all",
        totals.net >= 0 ? "bg-secondary/5" : "bg-tertiary/5"
      )}>
        <div className="min-w-0">
          <p className="text-micro text-on-surface-variant font-bold mb-1 uppercase tracking-wider">Net Flow</p>
          <p className={cn(
            'text-3xl font-headline font-extrabold tracking-tight tabular-nums whitespace-nowrap truncate',
            totals.net >= 0 ? 'text-secondary' : 'text-tertiary'
          )}>
            {totals.net >= 0 ? '+' : ''}{formatCurrency(totals.net)}
          </p>
        </div>
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm",
          totals.net >= 0 ? "bg-secondary/20 text-secondary" : "bg-tertiary/20 text-tertiary"
        )}>
          {totals.net >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
        </div>
      </div>

      {/* Monthly average for multi-month ranges */}
      {rangeMonths > 1 && (
        <div className="space-y-2 pt-2 border-t border-outline-variant/5">
          <p className="text-micro text-on-surface-variant font-bold px-1 uppercase tracking-wider">Monthly Averages</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-surface-container-low/50 rounded-2xl p-3 border border-outline-variant/5">
              <p className="text-[10px] text-on-surface-variant font-bold mb-1">Avg Income</p>
              <p className="text-sm font-bold text-secondary whitespace-nowrap">{formatCurrency(totals.income / rangeMonths)}</p>
            </div>
            <div className="bg-surface-container-low/50 rounded-2xl p-3 border border-outline-variant/5">
              <p className="text-[10px] text-on-surface-variant font-bold mb-1">Avg Expenses</p>
              <p className="text-sm font-bold text-tertiary whitespace-nowrap">{formatCurrency(totals.expenses / rangeMonths)}</p>
            </div>
            <div className="bg-surface-container-low/50 rounded-2xl p-3 border border-outline-variant/5">
              <p className="text-[10px] text-on-surface-variant font-bold mb-1">Avg Net</p>
              <p className={cn('text-sm font-bold whitespace-nowrap', totals.net >= 0 ? 'text-secondary' : 'text-tertiary')}>
                {totals.net >= 0 ? '+' : ''}{formatCurrency(totals.net / rangeMonths)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Period-over-period change */}
      {expenseChange !== null && (
        <div className={cn(
          'flex items-center gap-3 rounded-2xl p-3 border',
          expenseChange <= 0
            ? 'bg-secondary-container/10 border-secondary/20'
            : 'bg-tertiary-container/10 border-tertiary/20',
        )}>
          {expenseChange <= 0 ? (
            <ArrowDownRight className="w-5 h-5 text-secondary flex-shrink-0" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-tertiary flex-shrink-0" />
          )}
          <p className="text-xs font-bold text-on-surface">
            {expenseChange <= 0
              ? `Expenses down ${Math.abs(expenseChange).toFixed(1)}% vs previous period`
              : `Expenses up ${expenseChange.toFixed(1)}% vs previous period`
            }
          </p>
        </div>
      )}

      {/* Spending breakdown bar */}
      {categorySpending.length > 0 && (
        <Card className="space-y-3 p-4">
          <h3 className="text-xs font-bold text-on-surface-variant">Spending Breakdown</h3>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container-high">
            {categorySpending.map((cat) => {
              const theme = getCategoryTheme(cat.category);
              return (
                <div
                  key={cat.category}
                  className="h-full transition-all"
                  style={{ width: `${cat.percentage * 100}%`, backgroundColor: theme.color }}
                  title={`${cat.category}: ${(cat.percentage * 100).toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {categorySpending.map((cat) => {
              const theme = getCategoryTheme(cat.category);
              return (
                <div key={cat.category} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }} />
                  <span className="text-micro font-bold" style={{ color: theme.color }}>{cat.category}</span>
                  <span className="text-micro text-on-surface-variant">{(cat.percentage * 100).toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Category cards */}
      <div className="space-y-6">
        {allCategories.length === 0 ? (
          <p className="text-xs text-on-surface-variant/60 py-8 text-center">No transactions in this period</p>
        ) : (
          <>
            {/* ── Expenses Section ────────────────────────────── */}
            {allCategories.some(c => c.expense > 0) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-on-surface-variant px-1 border-b border-outline-variant/10 pb-1">Expenses</h3>
                {allCategories.filter(c => c.expense > 0).map(cat => {
                  const isExpanded = expandedCat === cat.category;
                  // Scale budget limit by number of months in range
                  const scaledLimit = cat.budget ? cat.budget.limit * rangeMonths : null;
                  const budgetPercent = scaledLimit ? Math.min(100, (cat.expense / scaledLimit) * 100) : null;
                  const catTx = periodTx.filter(t => t.category === cat.category);

                  return (
                    <div key={`expense-${cat.category}`}>
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : cat.category)}
                        className="w-full bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5 transition-all hover:bg-surface-container-low text-left"
                      >
                        {/* Row 1: Badge + Name + Amount */}
                        <div className="flex items-center gap-3">
                          <CategoryBadge category={cat.category} size="md" />
                          <p className="flex-1 min-w-0 truncate text-sm font-bold text-on-surface">{cat.category}</p>
                          <span className="text-sm font-extrabold text-tertiary tabular-nums shrink-0">
                            -{formatCurrency(cat.expense)}
                          </span>
                        </div>

                        {/* Row 2: Budget progress (full-width, under the header) */}
                        {budgetPercent !== null && scaledLimit && (
                          <div className="mt-3 space-y-1.5">
                            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  budgetPercent >= 100 ? 'bg-tertiary' : budgetPercent >= 80 ? 'bg-accent-amber' : 'bg-primary',
                                )}
                                style={{ width: `${Math.min(100, budgetPercent)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                'text-micro font-extrabold tabular-nums',
                                budgetPercent >= 100 ? 'text-tertiary' : budgetPercent >= 80 ? 'text-accent-amber' : 'text-on-surface-variant',
                              )}>
                                {budgetPercent.toFixed(0)}% of budget
                              </span>
                              <span className="text-micro font-semibold tabular-nums text-on-surface-variant">
                                {formatCurrency(cat.expense)} / {formatCurrency(scaledLimit)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Row 3: Trend indicator */}
                        {cat.change !== null && (
                          <div className={cn(
                            'mt-3 flex items-center gap-1.5 pt-2 border-t border-outline-variant/5',
                          )}>
                            <span className={cn(
                              'flex items-center gap-1 text-xs font-bold tabular-nums',
                              cat.change <= 0 ? 'text-secondary' : 'text-tertiary',
                            )}>
                              {cat.change <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                              {Math.abs(cat.change).toFixed(0)}%
                            </span>
                            <span className="text-xs text-on-surface-variant/60">vs previous period</span>
                          </div>
                        )}
                      </button>

                      {/* Expanded transaction list */}
                      {isExpanded && catTx.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-1.5 ml-6 mr-1 space-y-1 overflow-hidden"
                        >
                          {Finance.sortByDateDesc(catTx).map(tx => (
                            <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-container-low/50">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-on-surface truncate">{tx.title || tx.description || tx.category}</p>
                                <p className="text-micro text-on-surface-variant mt-0.5">
                                  {new Date(tx.date).toLocaleDateString('default', { day: 'numeric', month: 'short', year: rangeMonths > 12 ? 'numeric' : undefined })}
                                </p>
                              </div>
                              <span className={cn('text-xs font-bold tabular-nums', tx.type === 'income' ? 'text-secondary' : 'text-tertiary')}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Income Section ─────────────────────────────── */}
            {allCategories.some(c => c.income > 0) && (
              <div className="space-y-3 mt-6">
                <h3 className="text-xs font-bold text-on-surface-variant px-1 border-b border-outline-variant/10 pb-1">Income</h3>
                {allCategories.filter(c => c.income > 0).map(cat => {
                  const isExpanded = expandedCat === cat.category;
                  const catTx = periodTx.filter(t => t.category === cat.category);

                  return (
                    <div key={`income-${cat.category}`}>
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : cat.category)}
                        className="w-full bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5 transition-all hover:bg-surface-container-low text-left"
                      >
                        {/* Row 1: Badge + Name + Amount */}
                        <div className="flex items-center gap-3">
                          <CategoryBadge category={cat.category} size="md" />
                          <p className="flex-1 min-w-0 truncate text-sm font-bold text-on-surface">{cat.category}</p>
                          <span className="text-sm font-extrabold text-secondary tabular-nums shrink-0">
                            +{formatCurrency(cat.income)}
                          </span>
                        </div>

                        {/* Row 2: Trend indicator */}
                        {cat.change !== null && (
                          <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-outline-variant/5">
                            <span className={cn(
                              'flex items-center gap-1 text-xs font-bold tabular-nums',
                              cat.change >= 0 ? 'text-secondary' : 'text-tertiary',
                            )}>
                              {cat.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              {Math.abs(cat.change).toFixed(0)}%
                            </span>
                            <span className="text-xs text-on-surface-variant/60">vs previous period</span>
                          </div>
                        )}
                      </button>

                      {/* Expanded transaction list */}
                      {isExpanded && catTx.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-1.5 ml-6 mr-1 space-y-1 overflow-hidden"
                        >
                          {Finance.sortByDateDesc(catTx).map(tx => (
                            <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-container-low/50">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-on-surface truncate">{tx.title || tx.description || tx.category}</p>
                                <p className="text-micro text-on-surface-variant mt-0.5">
                                  {new Date(tx.date).toLocaleDateString('default', { day: 'numeric', month: 'short', year: rangeMonths > 12 ? 'numeric' : undefined })}
                                </p>
                              </div>
                              <span className={cn('text-xs font-bold tabular-nums', tx.type === 'income' ? 'text-secondary' : 'text-tertiary')}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
