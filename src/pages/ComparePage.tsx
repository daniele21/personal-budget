import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, ChevronDown, ChevronRight, Link as LinkIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import * as Finance from '../domain/finance';
import { Transaction } from '../types';
import { getCategoryTheme } from '../config/categoryThemes';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { pageTransition } from '../utils/motion';
import { SegmentedControl, PeriodSelector, getRangeDates, RangeKey } from '../components/ui';
import { CompareInsights } from '../components/compare/CompareInsights';

// ─── Period helpers ────────────────────────────────────────────────────

function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

// ─── Custom donut centre label ─────────────────────────────────────────

const DonutCentreLabel = ({
  cx,
  cy,
  total,
  periodLabel,
}: {
  cx: number;
  cy: number;
  total: number;
  periodLabel: string;
}) => (
  <g>
    <text x={cx} y={cy - 12} textAnchor="middle" dominantBaseline="middle" className="fill-on-surface-variant" style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Inter' }}>
      Total Expenses
    </text>
    <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle" className="fill-on-surface" style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Manrope' }}>
      {formatCurrency(total)}
    </text>
    <text x={cx} y={cy + 26} textAnchor="middle" dominantBaseline="middle" className="fill-on-surface-variant" style={{ fontSize: 9, fontWeight: 600, fontFamily: 'Inter' }}>
      {periodLabel}
    </text>
  </g>
);

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 text-xs shadow-md">
      <p className="font-bold" style={{ color: item.payload.color }}>{item.name}</p>
      <p className="font-bold text-on-surface">{formatCurrency(item.value)}</p>
      <p className="text-on-surface-variant">{(item.payload.percentage * 100).toFixed(1)}%</p>
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-2xl p-3 shadow-lg shadow-primary/5 text-xs min-w-[130px] transition-all duration-150">
      <p className="mb-1.5 font-headline font-bold text-on-surface">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => {
          const displayColor = entry.dataKey === 'current' 
            ? 'var(--color-primary)' 
            : entry.dataKey === 'prev' 
            ? 'var(--color-secondary)' 
            : entry.fill;
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3 font-semibold">
              <span className="text-on-surface-variant truncate max-w-[120px]">{entry.name}</span>
              <span className="font-extrabold" style={{ color: displayColor }}>
                {formatCurrency(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Tab A: Spending by Category ─────────────────────────────────────

function SpendingByCategoryTab({
  transactions,
  periodLabel,
  labelA,
  start,
  end,
  lens,
}: {
  transactions: Transaction[];
  periodLabel: string;
  labelA: string;
  start: Date;
  end: Date;
  lens: Finance.AnalyticsLens;
}) {
  const totalExpenses = useMemo(
    () => Finance.calculateTotals(transactions).expenses,
    [transactions],
  );
  const categorySpending = useMemo(
    () => Finance.spendingByCategory(transactions),
    [transactions],
  );

  // Assign a colour to each category using getCategoryTheme
  const slices = useMemo(
    () =>
      categorySpending.map((cat) => ({
        ...cat,
        color: getCategoryTheme(cat.category).color,
      })),
    [categorySpending],
  );

  if (totalExpenses === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
        <p className="text-sm font-bold">No expenses in this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* The ranked list is primary on mobile; the donut is supplementary on larger screens. */}
      <div className="hidden items-center justify-center md:flex" aria-label={`Category distribution for ${periodLabel}`}>
        <div style={{ width: 240, height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                dataKey="amount"
                nameKey="category"
                strokeWidth={0}
              >
                {slices.map((entry) => (
                  <Cell key={entry.category} fill={entry.color} />
                ))}
                <DonutCentreLabel
                  cx={120}
                  cy={120}
                  total={totalExpenses}
                  periodLabel={labelA}
                />
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Ranked category list ── */}
      <div className="aura-card divide-y divide-outline-variant/20 p-0 overflow-hidden">
        <div className="flex items-end justify-between gap-3 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Spending by category</h3>
            <p className="mt-0.5 text-[10px] font-semibold text-on-surface-variant">{periodLabel}</p>
          </div>
          <p className="shrink-0 font-headline text-lg font-extrabold tabular-nums text-on-surface">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        {slices.map((cat, i) => (
          <Link
            key={cat.category}
            to={`/transactions?category=${encodeURIComponent(cat.category)}&startDate=${formatDate(start)}&endDate=${formatDate(end)}&preset=custom&lens=${lens}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors duration-150"
          >
            {/* Rank */}
            <span className="w-4 shrink-0 text-xs font-bold text-on-surface-variant">
              {i + 1}
            </span>
            {/* Category icon */}
            <CategoryBadge category={cat.category} size="sm" />
            {/* Name + coloured bar */}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-bold text-on-surface">{cat.category}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${cat.percentage * 100}%`,
                    background: cat.color,
                  }}
                />
              </div>
            </div>
            {/* Amount + % */}
            <div className="shrink-0 text-right flex items-center gap-2">
              <div>
                <p className="text-sm font-extrabold text-on-surface tabular-nums">
                  {formatCurrency(cat.amount)}
                </p>
                <p className="text-[10px] font-bold text-on-surface-variant">
                  {(cat.percentage * 100).toFixed(0)}%
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-on-surface-variant/40 shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── View all transactions CTA ── */}
      <Link
        to="/transactions"
        className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-surface-container-low"
      >
        View all transactions
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ─── Tab B: Compare & Trends ───────────────────────────────────────────

type CompareView = 'total' | 'category' | 'merchant';

type PrimaryCompareView = Exclude<CompareView, 'merchant'>;

const PRIMARY_COMPARE_VIEWS: { value: PrimaryCompareView; label: string }[] = [
  { value: 'total', label: 'Total expenses' },
  { value: 'category', label: 'By category' },
];

function CompareTab({
  txA,
  txB,
  labelA,
  labelB,
  start,
  end,
  prevStart,
  prevEnd,
  lens,
  range,
}: {
  txA: Transaction[];
  txB: Transaction[];
  labelA: string;
  labelB: string;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  lens: Finance.AnalyticsLens;
  range: RangeKey;
}) {
  const [view, setView] = useState<CompareView>('total');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const totalsA = useMemo(() => Finance.calculateTotals(txA), [txA]);
  const totalsB = useMemo(() => Finance.calculateTotals(txB), [txB]);
  const delta = totalsA.expenses - totalsB.expenses;
  const deltaPercent = totalsB.expenses > 0
    ? ((totalsA.expenses - totalsB.expenses) / totalsB.expenses) * 100
    : null;

  const catA = useMemo(() => Finance.spendingByCategory(txA), [txA]);
  const catB = useMemo(() => Finance.spendingByCategory(txB), [txB]);
  const comparisonInsights = useMemo(
    () => Finance.getComparisonInsights(totalsA, totalsB, Finance.getCategoryDeltas(txA, txB)),
    [totalsA, totalsB, txA, txB],
  );

  const availableCategories = useMemo(() => {
    return Array.from(new Set([...catA.map((c) => c.category), ...catB.map((c) => c.category)]));
  }, [catA, catB]);

  // Set default category
  useEffect(() => {
    if (availableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(availableCategories[0]);
    }
  }, [availableCategories, selectedCategory]);

  // 1. Total Expenses (Compare categories)
  const categoryBarData = useMemo(() => {
    return availableCategories
      .map((cat) => ({
        name: cat,
        current: catA.find((c) => c.category === cat)?.amount ?? 0,
        prev: catB.find((c) => c.category === cat)?.amount ?? 0,
      }))
      .sort((a, b) => b.current - a.current)
      .slice(0, 6);
  }, [availableCategories, catA, catB]);

  // 2. By Category trend (weekly for 1M, monthly for 3M/6M/12M)
  const categoryTrendData = useMemo(() => {
    if (!selectedCategory) return [];

    if (range === '1M') {
      const lenA = end.getTime() - start.getTime();
      const lenB = prevEnd.getTime() - prevStart.getTime();

      const intervalLenA = lenA / 5;
      const intervalLenB = lenB / 5;

      return Array.from({ length: 5 }, (_, idx) => {
        const sA = new Date(start.getTime() + idx * intervalLenA);
        const eA = new Date(start.getTime() + (idx + 1) * intervalLenA);

        const sB = new Date(prevStart.getTime() + idx * intervalLenB);
        const eB = new Date(prevStart.getTime() + (idx + 1) * intervalLenB);

        const valA = Finance.calculateTotals(
          txA.filter((t) => t.category === selectedCategory && new Date(t.date) >= sA && new Date(t.date) < eA)
        ).expenses;

        const valB = Finance.calculateTotals(
          txB.filter((t) => t.category === selectedCategory && new Date(t.date) >= sB && new Date(t.date) < eB)
        ).expenses;

        return {
          name: `Week ${idx + 1}`,
          current: valA,
          prev: valB,
        };
      });
    }

    // For 3M, 6M, 12M: Group by calendar month
    const monthsCount = range === '3M' ? 3 : range === '6M' ? 6 : 12;

    return Array.from({ length: monthsCount }, (_, idx) => {
      const tempDateA = new Date(start.getFullYear(), start.getMonth() + idx, 1);
      const sA = new Date(tempDateA.getFullYear(), tempDateA.getMonth(), 1);
      const eA = new Date(tempDateA.getFullYear(), tempDateA.getMonth() + 1, 1);

      const tempDateB = new Date(prevStart.getFullYear(), prevStart.getMonth() + idx, 1);
      const sB = new Date(tempDateB.getFullYear(), tempDateB.getMonth(), 1);
      const eB = new Date(tempDateB.getFullYear(), tempDateB.getMonth() + 1, 1);

      const valA = Finance.calculateTotals(
        txA.filter((t) => t.category === selectedCategory && new Date(t.date) >= sA && new Date(t.date) < eA)
      ).expenses;

      const valB = Finance.calculateTotals(
        txB.filter((t) => t.category === selectedCategory && new Date(t.date) >= sB && new Date(t.date) < eB)
      ).expenses;

      const monthName = sA.toLocaleDateString('en-US', { month: 'short' });
      return {
        name: monthName,
        current: valA,
        prev: valB,
      };
    });
  }, [selectedCategory, txA, txB, start, end, prevStart, prevEnd, range]);

  // 3. By Merchant top comparison
  const merchantBarData = useMemo(() => {
    const expA = txA.filter((t) => t.type === 'expense' || Finance.getTransactionReportingClass(t) === 'reimbursement');
    const expB = txB.filter((t) => t.type === 'expense' || Finance.getTransactionReportingClass(t) === 'reimbursement');

    const merchantMapA = new Map<string, number>();
    expA.forEach((t) => {
      const name = t.title || t.description || 'Unknown';
      const amount = t.type === 'expense' ? t.amount : -t.amount;
      merchantMapA.set(name, (merchantMapA.get(name) || 0) + amount);
    });

    let topMerchants = Array.from(merchantMapA.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map((entry) => entry[0]);

    if (topMerchants.length === 0) {
      const merchantMapB = new Map<string, number>();
      expB.forEach((t) => {
        const name = t.title || t.description || 'Unknown';
        const amount = t.type === 'expense' ? t.amount : -t.amount;
        merchantMapB.set(name, (merchantMapB.get(name) || 0) + amount);
      });
      topMerchants = Array.from(merchantMapB.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map((entry) => entry[0]);
    }

    return topMerchants.map((merchant) => {
      const current = expA
        .filter((t) => (t.title || t.description || 'Unknown') === merchant)
        .reduce((s, t) => s + (t.type === 'expense' ? t.amount : -t.amount), 0);
      const prev = expB
        .filter((t) => (t.title || t.description || 'Unknown') === merchant)
        .reduce((s, t) => s + (t.type === 'expense' ? t.amount : -t.amount), 0);
      return { name: merchant, current: Math.max(0, current), prev: Math.max(0, prev) };
    });
  }, [txA, txB]);

  const activeChartData = useMemo(() => {
    if (view === 'category') return categoryTrendData;
    if (view === 'merchant') return merchantBarData;
    return categoryBarData;
  }, [view, categoryTrendData, merchantBarData, categoryBarData]);

  const topChanges = useMemo(() => {
    const cats = Array.from(new Set([...catA.map((c) => c.category), ...catB.map((c) => c.category)]));
    return cats
      .map((cat) => {
        const cur = catA.find((c) => c.category === cat)?.amount ?? 0;
        const prev = catB.find((c) => c.category === cat)?.amount ?? 0;
        const diff = cur - prev;
        const pct = prev > 0 ? (diff / prev) * 100 : null;
        return { category: cat, diff, pct, cur, prev };
      })
      .filter((c) => c.prev > 0 || c.cur > 0)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 5);
  }, [catA, catB]);

  if (txA.length === 0 && txB.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-14 text-center">
        <p className="text-sm font-bold text-on-surface">No transactions to compare</p>
        <p className="mt-1 text-xs text-on-surface-variant">There is no reportable activity in {labelA} or {labelB}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Period comparison header ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Period A (current) */}
        <Link
          to={`/transactions?startDate=${formatDate(start)}&endDate=${formatDate(end)}&preset=custom&lens=${lens}`}
          className="space-y-1 rounded-2xl bg-surface-container-lowest p-3 text-center border border-outline-variant/20 hover:bg-surface-container-low transition-colors duration-150 block"
        >
          <p className="text-[10px] font-bold text-on-surface-variant">{labelA}</p>
          <p className="font-headline text-2xl font-extrabold text-primary tabular-nums">
            {formatCurrency(totalsA.expenses)}
          </p>
          <p className="text-[10px] font-semibold text-on-surface-variant">Expenses</p>
          {/* Active indicator */}
          <div className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-primary" />
        </Link>
        {/* Period B (previous) */}
        <Link
          to={`/transactions?startDate=${formatDate(prevStart)}&endDate=${formatDate(prevEnd)}&preset=custom&lens=${lens}`}
          className="space-y-1 rounded-2xl bg-surface-container-lowest p-3 text-center border border-outline-variant/20 hover:bg-surface-container-low transition-colors duration-150 block"
        >
          <p className="text-[10px] font-bold text-on-surface-variant">{labelB}</p>
          <p className="font-headline text-2xl font-extrabold text-on-surface tabular-nums">
            {formatCurrency(totalsB.expenses)}
          </p>
          <p className="text-[10px] font-semibold text-on-surface-variant">Expenses</p>
          {/* Previous indicator */}
          <div className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-secondary" />
        </Link>
      </div>

      {/* ── Delta banner ── */}
      {deltaPercent !== null && (
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-4 py-3',
            delta > 0
              ? 'border border-accent-amber/20 bg-accent-amber/8'
              : 'border border-secondary/20 bg-secondary/8',
          )}
        >
          {delta > 0 ? (
            <TrendingUp className="h-4 w-4 shrink-0 text-accent-amber" />
          ) : (
            <TrendingDown className="h-4 w-4 shrink-0 text-secondary" />
          )}
          <p className="text-xs font-bold text-on-surface">
            <span className={delta > 0 ? 'text-accent-amber' : 'text-secondary'}>
              {delta > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(delta))} ({deltaPercent >= 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
            </span>{' '}
            {delta > 0 ? 'more' : 'less'} than {labelB}
          </p>
        </div>
      )}

      <CompareInsights insights={comparisonInsights} sourceLabel={`${labelA} compared with ${labelB}`} />

      {/* Merchant comparison is an occasional drill-down, not a peer tab. */}
      {view !== 'merchant' ? (
        <div className="space-y-2">
          <SegmentedControl
            value={view}
            options={PRIMARY_COMPARE_VIEWS}
            onChange={setView}
            ariaLabel="Expense comparison view"
            className="w-full"
          />
          <button
            type="button"
            onClick={() => setView('merchant')}
            className="ml-auto flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Compare by merchant
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2">
          <h3 className="text-sm font-bold text-on-surface">Merchant comparison</h3>
          <button
            type="button"
            onClick={() => setView('total')}
            className="rounded-lg px-2 py-1 text-xs font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Back to expenses
          </button>
        </div>
      )}

      {/* ── Category drilldown selector ── */}
      {view === 'category' && availableCategories.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold transition-all border border-outline-variant/30',
                selectedCategory === cat
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Grouped bar chart ── */}
      <div className="aura-card p-4">
        <div className="h-48">
          {activeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="compareCurrentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="comparePrevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-secondary)" />
                    <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 8, fill: 'var(--color-on-surface-variant)', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: 'var(--color-on-surface-variant)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `€${Math.round(v)}`}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="current"
                  name={labelA}
                  fill="url(#compareCurrentGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                />
                <Bar
                  dataKey="prev"
                  name={labelB}
                  fill="url(#comparePrevGrad)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-semibold text-on-surface-variant">
              No chart data available for selection
            </div>
          )}
        </div>
        {/* Legend */}
        <div className="mt-2 flex items-center gap-4 text-[10px] font-bold text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            {labelA}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-secondary" />
            {labelB}
          </span>
        </div>
      </div>

      {/* ── Top changes by category ── */}
      <div className="aura-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-3">
          <h3 className="text-sm font-bold text-on-surface">Top changes by category</h3>
        </div>
        <div className="divide-y divide-outline-variant/15">
          {topChanges.map((item) => (
            <Link
              key={item.category}
              to={`/transactions?category=${encodeURIComponent(item.category)}&startDate=${formatDate(start)}&endDate=${formatDate(end)}&preset=custom&lens=${lens}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors duration-150"
            >
              <CategoryBadge category={item.category} size="sm" className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-on-surface">{item.category}</p>
              </div>
              <div className="shrink-0 text-right flex items-center gap-2">
                <div>
                  <p
                    className={cn(
                      'text-sm font-extrabold tabular-nums',
                      item.diff > 0 ? 'text-tertiary' : 'text-secondary',
                    )}
                  >
                    {item.diff > 0 ? '+' : ''}{formatCurrency(item.diff)}
                  </p>
                  {item.pct !== null && (
                    <p
                      className={cn(
                        'text-[10px] font-bold',
                        item.diff > 0 ? 'text-tertiary' : 'text-secondary',
                      )}
                    >
                      {item.diff > 0 ? '+' : ''}{item.pct.toFixed(0)}%
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-on-surface-variant/40 shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
          {topChanges.length === 0 && (
            <p className="py-8 text-center text-xs font-medium text-on-surface-variant">
              No category data for this comparison
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ComparePage (main) ────────────────────────────────────────────────

type Tab = 'spending' | 'compare';

interface ComparePageProps {
  initialTab?: Tab;
  showViewSwitcher?: boolean;
  analyticsLens?: Finance.AnalyticsLens;
  onAnalyticsLensChange?: (lens: Finance.AnalyticsLens) => void;
  showLensControl?: boolean;
}

export function ComparePage({
  initialTab = 'spending',
  showViewSwitcher = true,
  analyticsLens,
  onAnalyticsLensChange,
  showLensControl = true,
}: ComparePageProps = {}) {
  const { transactions } = useApp();
  const today = new Date();
  const [anchorYear, setAnchorYear] = useState(today.getFullYear());
  const [anchorMonth, setAnchorMonth] = useState(today.getMonth());
  const [range, setRange] = useState<RangeKey>('1M');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [localLens, setLocalLens] = useState<Finance.AnalyticsLens>('actual');
  const lens = analyticsLens ?? localLens;
  const setLens = onAnalyticsLensChange ?? setLocalLens;

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // Default to start of this month
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const { start, end, prevStart, prevEnd, periodLabel: labelA, comparisonLabel: labelB } = useMemo(
    () => getRangeDates(range, anchorYear, anchorMonth, customStartDate, customEndDate),
    [range, anchorYear, anchorMonth, customStartDate, customEndDate],
  );

  const filteredTransactions = useMemo(
    () => Finance.filterByAnalyticsLens(transactions, lens),
    [transactions, lens],
  );

  const txA = useMemo(
    () => filteredTransactions.filter((t) => { const d = new Date(t.date); return d >= start && d <= end; }),
    [filteredTransactions, start, end],
  );
  const txB = useMemo(
    () => filteredTransactions.filter((t) => { const d = new Date(t.date); return d >= prevStart && d <= prevEnd; }),
    [filteredTransactions, prevStart, prevEnd],
  );

  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">

      {/* ── Period, lens, and selected range controls ── */}
      <PeriodSelector
        range={range}
        lens={lens}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        periodLabel={labelA}
        onRangeChange={setRange}
        onLensChange={setLens}
        showLensControl={showLensControl}
        onCustomDatesChange={(start, end) => {
          setCustomStartDate(start);
          setCustomEndDate(end);
        }}
      />

      {/* ── Tab switcher ── */}
      {showViewSwitcher && (
        <SegmentedControl
          value={tab}
          options={[
            { value: 'spending', label: 'Spending by Category' },
            { value: 'compare', label: 'Compare & Trends' },
          ]}
          onChange={setTab}
          ariaLabel="Reports view"
          className="w-full"
        />
      )}

      {/* ── Tab content ── */}
      {tab === 'spending' ? (
        <SpendingByCategoryTab
          transactions={txA}
          periodLabel={labelA}
          labelA={labelA}
          start={start}
          end={end}
          lens={lens}
        />
      ) : (
        <CompareTab
          txA={txA}
          txB={txB}
          labelA={labelA}
          labelB={labelB}
          start={start}
          end={end}
          prevStart={prevStart}
          prevEnd={prevEnd}
          lens={lens}
          range={range}
        />
      )}
    </motion.div>
  );
}
