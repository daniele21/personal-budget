import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import * as Finance from '../domain/finance';
import { Transaction } from '../types';
import { pageTransition } from '../utils/motion';
import { LensSelector } from '../components/ui';

// ─── Period helpers ──────────────────────────────────────────────────

type RangeKey = '1M' | '3M' | '6M' | '12M';
type InsightsLens = 'actual' | 'normalized';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '1M', label: 'This month' },
  { key: '3M', label: '3M' },
  { key: '6M', label: '6M' },
  { key: '12M', label: '12M' },
];

function getRangeDates(key: RangeKey, anchorYear: number, anchorMonth: number) {
  const end = new Date(anchorYear, anchorMonth + 1, 0, 23, 59, 59);
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let months: number;

  if (key === '1M') {
    start = new Date(anchorYear, anchorMonth, 1);
    prevEnd = new Date(anchorYear, anchorMonth, 0, 23, 59, 59);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    months = 1;
  } else {
    months = key === '3M' ? 3 : key === '6M' ? 6 : 12;
    start = new Date(anchorYear, anchorMonth - months + 1, 1);
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth() - months + 1, 1);
  }

  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const periodLabel = `${startLabel} – ${endLabel}`;
  const comparisonLabel = months === 1
    ? prevStart.toLocaleDateString('en-US', { month: 'short' })
    : `${prevStart.toLocaleDateString('en-US', { month: 'short' })} – ${prevEnd.toLocaleDateString('en-US', { month: 'short' })}`;

  return { start, end, prevStart, prevEnd, periodLabel, comparisonLabel };
}

/** Build weekly buckets for the overview chart */
function buildWeeklyData(
  transactions: Transaction[],
  start: Date,
  end: Date,
): { label: string; income: number; expenses: number; net: number }[] {
  const data: { label: string; income: number; expenses: number; net: number }[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    if (weekEnd > end) weekEnd.setTime(end.getTime());

    const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= cursor && d <= weekEnd;
    });
    const income = weekTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = weekTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    data.push({ label, income, expenses, net: income - expenses });

    cursor.setDate(cursor.getDate() + 7);
  }
  return data;
}

// ─── Custom tooltip ───────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 shadow-md text-xs">
      <p className="mb-1 font-bold text-on-surface-variant">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="font-bold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

// ─── 2x2 KPI Card ─────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  change: string | null;
  positive: boolean;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
}

function KpiCard({ label, value, change, positive, sub, icon, iconBg }: KpiCardProps) {
  return (
    <div className="aura-card space-y-1.5 p-3.5">
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-xl text-white', iconBg)}>
          {icon}
        </span>
        <span className="text-xs font-bold text-on-surface-variant">{label}</span>
      </div>
      <p className="font-headline text-xl font-extrabold tabular-nums text-on-surface leading-tight">
        {value}
      </p>
      {change && (
        <p className={cn('text-[10px] font-bold', positive ? 'text-secondary' : 'text-tertiary')}>
          {change}
        </p>
      )}
      {sub && <p className="text-[10px] font-semibold text-on-surface-variant">{sub}</p>}
    </div>
  );
}

// ─── Cash flow progress bar ────────────────────────────────────────────

function CashFlowBar({
  current,
  goal,
  change,
  comparisonLabel,
}: {
  current: number;
  goal: number | null;
  change: number | null;
  comparisonLabel: string;
}) {
  const pct = goal && goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-on-surface-variant">This month</span>
        {change !== null && (
          <span className={cn('font-bold', change >= 0 ? 'text-secondary' : 'text-tertiary')}>
            {change >= 0 ? '+' : ''}{change.toFixed(0)}% vs {comparisonLabel}
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-full rounded-full bg-secondary transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      {goal && (
        <div className="flex justify-between text-[10px] font-semibold text-on-surface-variant">
          <span>{formatCurrency(current)}</span>
          <span>Goal {formatCurrency(goal)}</span>
        </div>
      )}
    </div>
  );
}

// ─── InsightsPage ─────────────────────────────────────────────────────

export const InsightsPage = () => {
  const { transactions, selectedMonth, monthlyBudget } = useApp();
  const [lens, setLens] = useState<InsightsLens>('actual');
  const [range, setRange] = useState<RangeKey>('1M');
  
  const { start, end, prevStart, prevEnd, periodLabel, comparisonLabel } = useMemo(() => {
    const today = new Date();
    return getRangeDates(range, today.getFullYear(), today.getMonth());
  }, [range]);

  const filteredTransactions = useMemo(
    () => Finance.filterByAnalyticsLens(transactions, lens),
    [transactions, lens],
  );

  const periodTx = useMemo(
    () => Finance.filterByDateRange(filteredTransactions, start, end),
    [filteredTransactions, start, end],
  );
  const prevTx = useMemo(
    () => Finance.filterByDateRange(filteredTransactions, prevStart, prevEnd),
    [filteredTransactions, prevStart, prevEnd],
  );
  const extraImpact = useMemo(
    () => Finance.getExtraImpact(Finance.filterByDateRange(transactions, start, end)),
    [transactions, start, end],
  );

  const totals = useMemo(() => Finance.calculateTotals(periodTx), [periodTx]);
  const prevTotals = useMemo(() => Finance.calculateTotals(prevTx), [prevTx]);
  const safeToSpendIncomeCap = useMemo(
    () => Finance.calculateBudgetableCashInflowByLens(Finance.filterByDateRange(transactions, start, end), lens),
    [transactions, start, end, lens],
  );
  const safeToSpend = useMemo(
    () => Finance.safeToSpend(monthlyBudget, totals.expenses, safeToSpendIncomeCap),
    [monthlyBudget, totals.expenses, safeToSpendIncomeCap],
  );

  const incomeChange = prevTotals.income > 0
    ? ((totals.income - prevTotals.income) / prevTotals.income) * 100
    : null;
  const expenseChange = prevTotals.expenses > 0
    ? ((totals.expenses - prevTotals.expenses) / prevTotals.expenses) * 100
    : null;
  const netChange = prevTotals.net !== 0
    ? ((totals.net - prevTotals.net) / Math.abs(prevTotals.net)) * 100
    : null;

  const chartData = useMemo(() => buildWeeklyData(periodTx, start, end), [periodTx, start, end]);

  // Cash flow goal: use total income from prev period as soft target
  const cashFlowGoal = prevTotals.income > 0 ? prevTotals.income : null;

  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">

      {/* ── Period, lens, and selected range controls ── */}
      <div className="grid grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] items-center gap-2">
        <label className="relative min-w-0">
          <span className="sr-only">Select insights period</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as RangeKey)}
            className={cn(
              'block h-8 w-full min-w-0 appearance-none rounded-full border border-outline-variant/20 bg-surface-container-lowest',
              'py-1 pl-3 pr-8 text-xs font-bold text-primary shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
            )}
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
        </label>

        <LensSelector value={lens} onChange={setLens} className="mx-0 max-w-[9.25rem] shrink-0" />

        <div className="ml-auto flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-full border border-outline-variant/25 bg-surface-container-lowest px-2.5 py-1">
          <CalendarDays className="h-3 w-3 shrink-0 text-on-surface-variant" />
          <span className="truncate text-[10px] font-bold text-on-surface-variant">{periodLabel}</span>
        </div>
      </div>

      {extraImpact.count > 0 && (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-2 text-xs font-bold text-on-surface-variant">
          {lens === 'actual' ? 'Extras this period' : 'Excluded from Net'}: {formatCurrency(extraImpact.expenses)} expenses · {formatCurrency(extraImpact.income)} income
        </div>
      )}

      {/* ── 2×2 KPI grid ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <KpiCard
          label="Income"
          value={formatCurrency(totals.income)}
          change={incomeChange !== null ? `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(0)}% vs ${comparisonLabel}` : null}
          positive={incomeChange !== null && incomeChange >= 0}
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          iconBg="bg-secondary"
        />
        <KpiCard
          label="Expenses"
          value={formatCurrency(totals.expenses)}
          change={expenseChange !== null ? `${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(0)}% vs ${comparisonLabel}` : null}
          positive={expenseChange !== null && expenseChange <= 0}
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" strokeLinecap="round" /></svg>}
          iconBg="bg-primary"
        />
        <KpiCard
          label="Net Cash Flow"
          value={formatCurrency(totals.net)}
          change={netChange !== null ? `${netChange >= 0 ? '+' : ''}${netChange.toFixed(0)}% vs ${comparisonLabel}` : null}
          positive={netChange !== null && netChange >= 0}
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M3 12h18M12 3l9 9-9 9" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          iconBg="bg-accent-cyan"
        />
        <KpiCard
          label="Safe to Spend"
          value={formatCurrency(safeToSpend.remaining)}
          change={null}
          positive={true}
          sub={`of ${formatCurrency(safeToSpend.effectiveLimit)} safe limit`}
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          iconBg="bg-accent-purple"
        />
      </div>

      {/* ── Overview chart: bars (Income, Expenses) + line (Net Cash Flow) ── */}
      <div className="aura-card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">Overview</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-secondary" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Expenses
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent-cyan" />
            Net Cash Flow
          </span>
        </div>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'var(--color-on-surface-variant)', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--color-on-surface-variant)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${Math.round(v / 1000)}k`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="income"
                name="Income"
                fill="var(--color-secondary)"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="var(--color-primary)"
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net Cash Flow"
                stroke="var(--color-accent-cyan)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Cash flow this month ── */}
      <div className="aura-card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">Cash flow this month</h3>
          {netChange !== null && (
            <span className={cn('text-xs font-bold', netChange >= 0 ? 'text-secondary' : 'text-tertiary')}>
              {netChange >= 0 ? '+' : ''}{netChange.toFixed(0)}% vs {comparisonLabel}
            </span>
          )}
        </div>
        <CashFlowBar
          current={totals.net}
          goal={cashFlowGoal}
          change={netChange}
          comparisonLabel={comparisonLabel}
        />
      </div>
    </motion.div>
  );
};
