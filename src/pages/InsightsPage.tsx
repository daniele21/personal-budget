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
import { getLocalDateInputValue } from '../utils/dates';
import { PeriodSelector, getRangeDates, RangeKey, BottomSheet, FocalSummaryCard } from '../components/ui';
import { getSpendingPaceReport } from '../domain/monthlyReporting';

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

// ─── Cash flow comparison ──────────────────────────────────────────────

function CashFlowComparison({
  current,
  previous,
  comparisonLabel,
}: {
  current: number;
  previous: number;
  comparisonLabel: string;
}) {
  return (
    <div className="grid grid-cols-2 divide-x divide-outline-variant/20">
      <div className="pr-3">
        <p className="text-[10px] font-semibold text-on-surface-variant">Net cash flow</p>
        <p className={cn('mt-1 text-base font-extrabold tabular-nums', current >= 0 ? 'text-secondary' : 'text-tertiary')}>
          {formatCurrency(current)}
        </p>
      </div>
      <div className="pl-3">
        <p className="text-[10px] font-semibold text-on-surface-variant">Previous period</p>
        <p className={cn('mt-1 text-base font-extrabold tabular-nums', previous >= 0 ? 'text-on-surface' : 'text-tertiary')}>
          {formatCurrency(previous)}
        </p>
        <p className="mt-0.5 truncate text-[9px] font-semibold text-on-surface-variant">{comparisonLabel}</p>
      </div>
    </div>
  );
}

// ─── InsightsPage ─────────────────────────────────────────────────────

interface InsightsPageProps {
  analyticsLens?: Finance.AnalyticsLens;
  onAnalyticsLensChange?: (lens: Finance.AnalyticsLens) => void;
  showLensControl?: boolean;
}

export const InsightsPage = ({ analyticsLens, onAnalyticsLensChange, showLensControl = true }: InsightsPageProps = {}) => {
  const { transactions } = useApp();
  const [localLens, setLocalLens] = useState<Finance.AnalyticsLens>('actual');
  const lens = analyticsLens ?? localLens;
  const setLens = onAnalyticsLensChange ?? setLocalLens;
  const [range, setRange] = useState<RangeKey>('1M');

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // Default to start of this month
    return getLocalDateInputValue(d);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return getLocalDateInputValue();
  });
  const [isAvgTrendOpen, setIsAvgTrendOpen] = useState(false);
  
  const { start, end, prevStart, prevEnd, periodLabel, comparisonLabel } = useMemo(() => {
    if (range === 'CUSTOM') {
      return getRangeDates(
        range,
        new Date().getFullYear(),
        new Date().getMonth(),
        customStartDate,
        customEndDate,
      );
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
  const expenseChange = prevTotals.expenses > 0
    ? ((totals.expenses - prevTotals.expenses) / prevTotals.expenses) * 100
    : null;
  const netChange = prevTotals.net !== 0
    ? ((totals.net - prevTotals.net) / Math.abs(prevTotals.net)) * 100
    : null;

  const chartData = useMemo(() => buildWeeklyData(periodTx, start, end), [periodTx, start, end]);

  const { rollingStart, rollingEnd, rollingPeriodLabel } = useMemo(() => {
    const today = new Date();
    const lastCompleteMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    let paceStart: Date;
    let paceEnd: Date;

    if (range === 'CUSTOM') {
      paceStart = start;
      paceEnd = end < endOfToday ? end : endOfToday;
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

  const spendingPace = useMemo(
    () => getSpendingPaceReport(transactions, rollingStart, rollingEnd, lens),
    [transactions, rollingStart, rollingEnd, lens],
  );

  const periodControl = (
    <PeriodSelector
      range={range}
      lens={lens}
      customStartDate={customStartDate}
      customEndDate={customEndDate}
      periodLabel={periodLabel}
      onRangeChange={setRange}
      onLensChange={setLens}
      showLensControl={showLensControl}
      onCustomDatesChange={(nextStart, nextEnd) => {
        setCustomStartDate(nextStart);
        setCustomEndDate(nextEnd);
      }}
    />
  );

  if (periodTx.length === 0) {
    return (
      <motion.div {...pageTransition} className="space-y-4 pb-24">
        {periodControl}
        <div
          data-tour-id="reports-empty"
          className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-14 text-center"
        >
          <p className="text-sm font-bold text-on-surface">No activity in this period</p>
          <p className="mt-1 text-xs text-on-surface-variant">Choose another period or add transactions to generate the report.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">

      {/* ── Period, lens, and selected range controls ── */}
      {periodControl}

      {extraImpact.count > 0 && (
        <div className="aura-section-surface px-4 py-2 text-xs font-semibold text-on-surface-variant">
          {lens === 'actual' ? 'Extras this period' : 'Excluded from Net'}: {formatCurrency(extraImpact.expenses)} expenses · {formatCurrency(extraImpact.income)} income
        </div>
      )}

      <FocalSummaryCard
        data-tour-id="reports-overview-summary"
        tone={expenseChange !== null && expenseChange > 0 ? 'warning' : 'primary'}
      >
        <div>
          <p className="text-xs font-semibold text-inverse-on-surface-variant">Spent</p>
          <p className="mt-1 font-headline text-4xl font-extrabold tabular-nums text-inverse-on-surface">
            {formatCurrency(totals.expenses)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-inverse-on-surface-variant">
          <span>{periodLabel}</span>
          {expenseChange !== null && (
            <span className={expenseChange <= 0 ? 'text-inverse-positive' : 'text-inverse-warning'}>
              {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(0)}% vs {comparisonLabel}
            </span>
          )}
        </div>
      </FocalSummaryCard>

      {/* ── Rolling spending pace ── */}
      {rollingStart <= rollingEnd && (
        <button
          data-tour-id="reports-spending-pace"
          onClick={() => setIsAvgTrendOpen(true)}
          className="aura-section-surface aura-section-tone-warning w-full p-4 text-left transition-colors active:scale-[0.995]"
          aria-label="Open spending pace trend"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-on-surface">Spending pace</span>
            <span className="text-xs font-semibold text-on-surface-variant">View trend →</span>
          </div>
          {spendingPace.monthlyPace !== null ? (
            <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3">
              {[
                {
                  value: spendingPace.monthlyPace,
                  label: 'per month',
                  context: `${spendingPace.baselineMonthCount} complete ${spendingPace.baselineMonthCount === 1 ? 'month' : 'months'}`,
                  primary: true,
                },
                {
                  value: spendingPace.weeklyEquivalent,
                  label: 'per week',
                  context: 'monthly equivalent',
                  primary: false,
                },
                {
                  value: spendingPace.dailyEquivalent,
                  label: 'per day',
                  context: 'monthly equivalent',
                  primary: false,
                },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0">
                  <p className={`truncate font-headline font-extrabold tabular-nums text-tertiary ${metric.primary ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'}`}>
                    {formatCurrency(metric.value ?? 0)}
                  </p>
                  <p className="text-[10px] font-bold text-on-surface">{metric.label}</p>
                  <p className="mt-0.5 text-[9px] font-semibold text-on-surface-variant">{metric.context}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-surface-container-low px-3 py-3">
              <p className="text-xs font-bold text-on-surface">Not enough complete history</p>
              <p className="mt-0.5 text-[10px] font-semibold text-on-surface-variant">
                Spending pace starts after the first complete calendar month.
              </p>
            </div>
          )}
        </button>
      )}

      {/* ── Overview chart: bars (Income, Expenses) + line (Net Cash Flow) ── */}
      <div data-tour-id="reports-overview-chart" className="aura-card aura-card-tone-primary space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">Overview</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-tr from-secondary to-secondary/55" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-tr from-tertiary to-tertiary/55" />
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
                  <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--color-secondary)" />
                </linearGradient>
                <linearGradient id="expenseComposedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity={0.55} />
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
          <h3 className="text-sm font-bold text-on-surface">Net cash flow</h3>
          {netChange !== null && (
            <span className={cn('text-xs font-bold', netChange >= 0 ? 'text-secondary' : 'text-tertiary')}>
              {netChange >= 0 ? '+' : ''}{netChange.toFixed(0)}% vs {comparisonLabel}
            </span>
          )}
        </div>
        <CashFlowComparison
          current={totals.net}
          previous={prevTotals.net}
          comparisonLabel={comparisonLabel}
        />
      </div>

      <BottomSheet
        isOpen={isAvgTrendOpen}
        title="Spending pace"
        subtitle={`Calendar-month spending · ${rollingPeriodLabel}`}
        onClose={() => setIsAvgTrendOpen(false)}
      >
        <div className="space-y-4 pt-2">
          {spendingPace.points.length > 0 ? (
            <>
              <div
                className="h-64 w-full"
                role="img"
                aria-label={`Actual monthly spending and monthly spending pace, ${rollingPeriodLabel}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={spendingPace.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      tickFormatter={(v) => `€${Math.round(v)}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0].payload;
                        return (
                          <div className="glass-card min-w-[150px] rounded-2xl p-3 text-xs shadow-lg shadow-primary/5">
                            <p className="mb-1.5 font-bold text-on-surface">{label}</p>
                            <div className="space-y-1 font-semibold">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-on-surface-variant">Actual</span>
                                <span className="font-extrabold text-primary">{formatCurrency(point.actual)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-on-surface-variant">Pace ({point.baselineMonthCount} mo)</span>
                                <span className="font-extrabold text-tertiary">{formatCurrency(point.pace)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="actual"
                      name="Actual monthly spending"
                      fill="var(--color-primary)"
                      fillOpacity={0.22}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                    <Line
                      type="monotone"
                      dataKey="pace"
                      name="Monthly pace"
                      stroke="var(--color-tertiary)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: 'var(--color-tertiary)' }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <ul className="sr-only">
                {spendingPace.points.map((point) => (
                  <li key={point.key}>
                    {point.label}: actual {formatCurrency(point.actual)}, pace {formatCurrency(point.pace)} over {point.baselineMonthCount} complete months
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="rounded-2xl bg-surface-container-low px-4 py-8 text-center">
              <p className="text-sm font-bold text-on-surface">No complete month available</p>
              <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                Choose a range containing at least one completed calendar month.
              </p>
            </div>
          )}
          
          <div className="rounded-2xl bg-surface-container-low p-3.5 text-xs font-semibold leading-relaxed text-on-surface-variant">
            Bars show actual spending for each complete month. The line averages that month and up to two preceding complete months; weekly and daily figures are equivalents of the same baseline.
          </div>
        </div>
      </BottomSheet>
    </motion.div>
  );
};
