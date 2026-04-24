import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from '../components/CategoryIcon';
import { cn } from '../lib/utils';
import { Transaction } from '../types';
import * as Finance from '../domain/finance';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 pb-24"
    >
      <section className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Reports</p>
        <h2 className="font-headline text-2xl font-extrabold text-primary">Weekly and monthly analysis</h2>
      </section>

      {/* Range selector */}
      <div className="flex items-center gap-1 bg-surface-container-high rounded-2xl p-1">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => { setRange(r.key); setExpandedCat(null); }}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all',
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
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Income</p>
          <p className="text-base font-bold text-secondary">{formatCurrency(totals.income)}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Expenses</p>
          <p className="text-base font-bold text-tertiary">{formatCurrency(totals.expenses)}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-3 border border-outline-variant/5">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Net</p>
          <p className={cn('text-base font-bold', totals.net >= 0 ? 'text-secondary' : 'text-tertiary')}>
            {totals.net >= 0 ? '+' : ''}{formatCurrency(totals.net)}
          </p>
        </div>
      </div>

      {/* Monthly average for multi-month ranges */}
      {rangeMonths > 1 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-container-low/50 rounded-2xl p-2.5 border border-outline-variant/5">
            <p className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mb-0.5">Avg/mo Income</p>
            <p className="text-sm font-bold text-secondary">{formatCurrency(totals.income / rangeMonths)}</p>
          </div>
          <div className="bg-surface-container-low/50 rounded-2xl p-2.5 border border-outline-variant/5">
            <p className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mb-0.5">Avg/mo Expenses</p>
            <p className="text-sm font-bold text-tertiary">{formatCurrency(totals.expenses / rangeMonths)}</p>
          </div>
          <div className="bg-surface-container-low/50 rounded-2xl p-2.5 border border-outline-variant/5">
            <p className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mb-0.5">Avg/mo Net</p>
            <p className={cn('text-sm font-bold', totals.net >= 0 ? 'text-secondary' : 'text-tertiary')}>
              {totals.net >= 0 ? '+' : ''}{formatCurrency(totals.net / rangeMonths)}
            </p>
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
        <div className="bg-surface-container-lowest rounded-3xl p-4 border border-outline-variant/5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Spending Breakdown</h3>
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container-high">
            {categorySpending.map((cat, i) => (
              <div
                key={cat.category}
                className={cn('h-full transition-all', BAR_COLORS[i % BAR_COLORS.length])}
                style={{ width: `${cat.percentage * 100}%` }}
                title={`${cat.category}: ${(cat.percentage * 100).toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {categorySpending.map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', BAR_COLORS[i % BAR_COLORS.length])} />
                <span className={cn('text-[10px] font-bold', TEXT_COLORS[i % TEXT_COLORS.length])}>{cat.category}</span>
                <span className="text-[10px] text-on-surface-variant">{(cat.percentage * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">By Category</h3>
        {allCategories.length === 0 ? (
          <p className="text-xs text-on-surface-variant/60 py-8 text-center">No transactions in this period</p>
        ) : (
          allCategories.map(cat => {
            const isExpanded = expandedCat === cat.category;
            // Scale budget limit by number of months in range
            const scaledLimit = cat.budget ? cat.budget.limit * rangeMonths : null;
            const budgetPercent = scaledLimit ? Math.min(100, (cat.expense / scaledLimit) * 100) : null;
            const catTx = periodTx.filter(t => t.category === cat.category);

            return (
              <div key={cat.category}>
                <button
                  onClick={() => setExpandedCat(isExpanded ? null : cat.category)}
                  className="w-full bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5 transition-all hover:bg-surface-container-low"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon category={cat.category} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-on-surface truncate">{cat.category}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {cat.expense > 0 && (
                            <span className="text-sm font-bold text-tertiary">-{formatCurrency(cat.expense)}</span>
                          )}
                          {cat.income > 0 && (
                            <span className="text-sm font-bold text-secondary">+{formatCurrency(cat.income)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-1">
                        {budgetPercent !== null && (
                          <div className="flex-1">
                            <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  budgetPercent >= 100 ? 'bg-tertiary' : budgetPercent >= 80 ? 'bg-[#f59e0b]' : 'bg-primary',
                                )}
                                style={{ width: `${Math.min(100, budgetPercent)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {cat.change !== null && (
                          <span className={cn(
                            'text-[10px] font-bold flex items-center gap-0.5',
                            cat.change <= 0 ? 'text-secondary' : 'text-tertiary',
                          )}>
                            {cat.change <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                            {Math.abs(cat.change).toFixed(0)}%
                          </span>
                        )}

                        {budgetPercent !== null && scaledLimit && (
                          <span className="text-[10px] text-on-surface-variant font-bold">
                            {formatCurrency(cat.expense)} / {formatCurrency(scaledLimit)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && catTx.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="ml-4 mt-1 space-y-1 overflow-hidden"
                  >
                    {Finance.sortByDateDesc(catTx).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface-container-low/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{tx.title || tx.description || tx.category}</p>
                          <p className="text-[10px] text-on-surface-variant">
                            {new Date(tx.date).toLocaleDateString('default', { day: 'numeric', month: 'short', year: rangeMonths > 12 ? 'numeric' : undefined })}
                          </p>
                        </div>
                        <span className={cn('text-xs font-bold', tx.type === 'income' ? 'text-secondary' : 'text-tertiary')}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
