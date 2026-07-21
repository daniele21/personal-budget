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
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import * as Finance from '../domain/finance';
import { Transaction } from '../types';
import { pageTransition } from '../utils/motion';
import { PeriodSelector, getRangeDates, RangeKey, BottomSheet, SegmentedControl } from '../components/ui';

type InsightsLens = 'actual' | 'normalized';

// ─── Period helpers ──────────────────────────────────────────────────

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
    weekEnd.setHours(23, 59, 59, 999);
    if (weekEnd > end) {
      weekEnd.setTime(end.getTime());
      weekEnd.setHours(23, 59, 59, 999);
    }

    const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= cursor && d <= weekEnd;
    });
    const totals = Finance.calculateTotals(weekTx);
    data.push({ label, income: totals.income, expenses: totals.expenses, net: totals.net });

    cursor.setDate(cursor.getDate() + 7);
  }
  return data;
}



const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-2xl p-3 shadow-lg shadow-primary/5 text-xs min-w-[130px] transition-all duration-150">
      <p className="mb-1.5 font-headline font-bold text-on-surface">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => {
          const displayColor = entry.name === 'Income' 
            ? 'var(--color-secondary)' 
            : entry.name === 'Expenses' 
            ? 'var(--color-tertiary)' 
            : entry.color;
          return (
            <div key={entry.name} className="flex items-center justify-between gap-3 font-semibold">
              <span className="text-on-surface-variant">{entry.name}</span>
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

// ─── 2x2 KPI Card ─────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  change: string | null;
  positive: boolean;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  surfaceClassName: string;
  valueClassName?: string;
}

function KpiCard({ label, value, change, positive, sub, icon, iconBg, surfaceClassName, valueClassName }: KpiCardProps) {
  return (
    <div className={cn('aura-kpi-cell space-y-1.5 p-3.5', surfaceClassName)}>
      <div className="flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-xl text-white', iconBg)}>
          {icon}
        </span>
        <span className="text-xs font-bold text-on-surface-variant">{label}</span>
      </div>
      <p className={cn("font-headline text-xl font-extrabold tabular-nums leading-tight", valueClassName || "text-on-surface")}>
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

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // Default to start of this month
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isAvgTrendOpen, setIsAvgTrendOpen] = useState(false);
  const [spendingPaceScale, setSpendingPaceScale] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  const { start, end, prevStart, prevEnd, periodLabel, comparisonLabel } = useMemo(() => {
    if (range === 'CUSTOM') {
      const s = new Date(customStartDate + 'T00:00:00');
      const e = new Date(customEndDate + 'T23:59:59');
      
      const durationMs = e.getTime() - s.getTime();
      const pEnd = new Date(s.getTime() - 1);
      const pStart = new Date(pEnd.getTime() - durationMs);
      
      const startLabel = s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const endLabel = e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const periodLabel = `${startLabel} – ${endLabel}`;
      
      const prevStartLabel = pStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const prevEndLabel = pEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const comparisonLabel = `${prevStartLabel} – ${prevEndLabel}`;
      
      return { start: s, end: e, prevStart: pStart, prevEnd: pEnd, periodLabel, comparisonLabel };
    }
    const today = new Date();
    return getRangeDates(range, today.getFullYear(), today.getMonth());
  }, [range, customStartDate, customEndDate]);

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

  const { rollingStart, rollingEnd, rollingPeriodLabel } = useMemo(() => {
    const today = new Date();
    const lastCompleteMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    let paceStart: Date;
    let paceEnd: Date;

    if (range === 'CUSTOM') {
      paceStart = start;
      paceEnd = end < lastCompleteMonthEnd ? end : lastCompleteMonthEnd;
    } else {
      const completeMonths = range === '3M' ? 3 : range === '6M' ? 6 : range === '12M' ? 12 : 1;
      paceEnd = lastCompleteMonthEnd;
      paceStart = new Date(paceEnd.getFullYear(), paceEnd.getMonth() - completeMonths + 1, 1);
    }

    const startLabel = paceStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const endLabel = paceEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    return {
      rollingStart: paceStart,
      rollingEnd: paceEnd,
      rollingPeriodLabel: `${startLabel} – ${endLabel}`,
    };
  }, [range, start, end]);

  const sevenDaySpendingData = useMemo(
    () => Finance.calculateRollingSpending(filteredTransactions, rollingStart, rollingEnd, 7),
    [filteredTransactions, rollingStart, rollingEnd],
  );
  const fourWeekSpendingData = useMemo(
    () => Finance.calculateRollingSpending(filteredTransactions, rollingStart, rollingEnd, 28),
    [filteredTransactions, rollingStart, rollingEnd],
  );
  const dailySpendingData = useMemo(
    () => sevenDaySpendingData.map((point) => ({ ...point, value: point.value / 7 })),
    [sevenDaySpendingData],
  );
  const weeklySpendingData = useMemo(
    () => fourWeekSpendingData.map((point) => ({ ...point, value: point.value / 4 })),
    [fourWeekSpendingData],
  );
  const monthlySpendingData = useMemo(
    () => Finance.calculateRollingSpending(filteredTransactions, rollingStart, rollingEnd, 90)
      .map((point) => ({ ...point, value: point.value / 3 })),
    [filteredTransactions, rollingStart, rollingEnd],
  );

  const spendingPaceData = spendingPaceScale === 'daily'
    ? dailySpendingData
    : spendingPaceScale === 'weekly'
      ? weeklySpendingData
      : monthlySpendingData;
  const dailyPace = dailySpendingData.at(-1)?.value ?? 0;
  const weeklyPace = weeklySpendingData.at(-1)?.value ?? 0;
  const monthlyPace = monthlySpendingData.at(-1)?.value ?? 0;
  const spendingPaceUnit = spendingPaceScale === 'daily'
    ? 'per day, averaged over the preceding 7 days'
    : spendingPaceScale === 'weekly'
      ? 'per week, averaged over the preceding 4 weeks'
      : 'per month, averaged over the preceding 3 months';

  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">

      {/* ── Period, lens, and selected range controls ── */}
      <PeriodSelector
        range={range}
        lens={lens}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        periodLabel={periodLabel}
        onRangeChange={setRange}
        onLensChange={setLens}
        onCustomDatesChange={(start, end) => {
          setCustomStartDate(start);
          setCustomEndDate(end);
        }}
      />

      {extraImpact.count > 0 && (
        <div className="aura-section-surface px-4 py-2 text-xs font-semibold text-on-surface-variant">
          {lens === 'actual' ? 'Extras this period' : 'Excluded from Net'}: {formatCurrency(extraImpact.expenses)} expenses · {formatCurrency(extraImpact.income)} income
        </div>
      )}

      {/* ── 2×2 KPI grid ── */}
      <div className="aura-kpi-panel grid grid-cols-2">
        <KpiCard
          label="Income"
          value={formatCurrency(totals.income)}
          change={incomeChange !== null ? `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(0)}% vs ${comparisonLabel}` : null}
          positive={incomeChange !== null && incomeChange >= 0}
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          iconBg="bg-secondary"
          surfaceClassName="aura-kpi-positive"
          valueClassName="text-secondary"
        />
        <KpiCard
          label="Expenses"
          value={formatCurrency(totals.expenses)}
          change={expenseChange !== null ? `${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(0)}% vs ${comparisonLabel}` : null}
          positive={expenseChange !== null && expenseChange <= 0}
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" strokeLinecap="round" /></svg>}
          iconBg="bg-primary"
          surfaceClassName="aura-kpi-neutral"
          valueClassName="text-on-surface"
        />
        <KpiCard
          label="Net Cash Flow"
          value={formatCurrency(totals.net)}
          change={netChange !== null ? `${netChange >= 0 ? '+' : ''}${netChange.toFixed(0)}% vs ${comparisonLabel}` : null}
          positive={netChange !== null && netChange >= 0}
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M3 12h18M12 3l9 9-9 9" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          iconBg="bg-accent-cyan"
          surfaceClassName="aura-kpi-primary"
          valueClassName={totals.net >= 0 ? "text-secondary" : "text-tertiary"}
        />
        <KpiCard
          label="Safe to Spend"
          value={formatCurrency(safeToSpend.remaining)}
          change={null}
          positive={true}
          sub={`of ${formatCurrency(safeToSpend.effectiveLimit)} safe limit`}
          icon={<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          iconBg={safeToSpend.remaining <= 0 ? 'bg-tertiary' : 'bg-primary'}
          surfaceClassName={safeToSpend.remaining <= 0 ? 'aura-kpi-warning' : 'aura-kpi-primary'}
          valueClassName={safeToSpend.remaining <= 0 ? 'text-tertiary' : 'text-primary'}
        />
      </div>

      {/* ── Rolling spending pace ── */}
      <button
        onClick={() => setIsAvgTrendOpen(true)}
        className="aura-section-surface aura-section-tone-warning w-full p-4 text-left transition-colors active:scale-[0.995]"
        aria-label="Open spending pace trend"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-on-surface">Spending pace</span>
          <span className="text-xs font-semibold text-on-surface-variant">View trend →</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: dailyPace, label: 'per day', context: '7-day average' },
            { value: weeklyPace, label: 'per week', context: '4-week average' },
            { value: monthlyPace, label: 'per month', context: '3-month average' },
          ].map((metric) => (
            <div key={metric.label} className="min-w-0">
              <p className="truncate font-headline text-base font-extrabold tabular-nums text-tertiary sm:text-lg">
                {formatCurrency(metric.value)}
              </p>
              <p className="text-[10px] font-bold text-on-surface">{metric.label}</p>
              <p className="mt-0.5 text-[9px] font-semibold text-on-surface-variant">{metric.context}</p>
            </div>
          ))}
        </div>
      </button>

      {/* ── Overview chart: bars (Income, Expenses) + line (Net Cash Flow) ── */}
      <div className="aura-card aura-card-tone-primary space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">Overview</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-tr from-secondary to-[#34d399]" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-tr from-tertiary to-[#f87171]" />
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
              <defs>
                <linearGradient id="incomeComposedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="var(--color-secondary)" />
                </linearGradient>
                <linearGradient id="expenseComposedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="var(--color-tertiary)" />
                </linearGradient>
              </defs>
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
                fill="url(#incomeComposedGrad)"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="url(#expenseComposedGrad)"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net Cash Flow"
                stroke="var(--color-accent-cyan)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Cash flow this month ── */}
      <div className="aura-section-surface aura-section-tone-primary space-y-3 p-4">
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

      <BottomSheet
        isOpen={isAvgTrendOpen}
        title="Spending pace"
        subtitle={`Rolling spending trend · ${rollingPeriodLabel}`}
        onClose={() => setIsAvgTrendOpen(false)}
      >
        <div className="space-y-4 pt-2">
          <SegmentedControl
            value={spendingPaceScale}
            options={[
              { value: 'daily', label: 'Day' },
              { value: 'weekly', label: 'Week' },
              { value: 'monthly', label: 'Month' },
            ]}
            onChange={(value) => setSpendingPaceScale(value as 'daily' | 'weekly' | 'monthly')}
            ariaLabel="Spending pace scale"
            className="w-full"
            size="compact"
          />

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={spendingPaceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 9, fill: 'var(--color-on-surface-variant)', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'var(--color-on-surface-variant)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `€${Math.round(v)}`}
                />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="glass-card rounded-2xl p-3 shadow-lg shadow-primary/5 text-xs min-w-[130px]">
                        <p className="mb-1 font-bold text-on-surface">{label}</p>
                        <div className="flex items-center justify-between gap-3 font-semibold text-tertiary">
                          <span>{spendingPaceScale === 'daily' ? 'Daily pace' : spendingPaceScale === 'weekly' ? 'Weekly pace' : 'Monthly pace'}</span>
                          <span className="font-extrabold">
                            {formatCurrency(payload[0].value)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-tertiary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="rounded-2xl bg-surface-container-low p-3.5 text-xs font-semibold leading-relaxed text-on-surface-variant">
            Each point shows how much you were spending {spendingPaceUnit} on that date.
          </div>
        </div>
      </BottomSheet>
    </motion.div>
  );
};
