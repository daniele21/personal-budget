import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, CircleDashed } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { FocalSummaryCard, PeriodSelector, getRangeDates, type RangeKey } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { AnalyticsLens } from '../domain/finance';
import { getTransactionReportingClass } from '../domain/finance';
import { getCategoryReport } from '../domain/monthlyReporting';
import { formatCurrency, formatDate } from '../utils/formatters';

const RANGE_KEYS: RangeKey[] = ['1M', 'LM', '3M', '6M', '12M', 'CUSTOM'];

function isRangeKey(value: string | null): value is RangeKey {
  return RANGE_KEYS.includes(value as RangeKey);
}

function formatDateInput(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function validDateInput(value: string | null, fallback: Date): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDateInput(fallback);
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? formatDateInput(fallback) : value;
}

function parseLens(value: string | null): AnalyticsLens | null {
  return value === 'actual' || value === 'normalized' || value === 'extras' ? value : null;
}

interface CategoryReportPageProps {
  analyticsLens: AnalyticsLens;
  onAnalyticsLensChange: (lens: AnalyticsLens) => void;
}

export function CategoryReportPage({
  analyticsLens,
  onAnalyticsLensChange,
}: CategoryReportPageProps) {
  const { category: categoryParam = '' } = useParams();
  const category = categoryParam;
  const { transactions, categories, archivedCategories } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const initialParams = useMemo(() => new URLSearchParams(location.search), []);
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const initialEndDate = validDateInput(initialParams.get('endDate'), today);
  const initialAnchor = new Date(`${initialEndDate}T00:00:00`);
  const [anchorYear] = useState(initialAnchor.getFullYear());
  const [anchorMonth] = useState(initialAnchor.getMonth());
  const [range, setRange] = useState<RangeKey>(() => {
    const requested = initialParams.get('range');
    return isRangeKey(requested) ? requested : '12M';
  });
  const [customStartDate, setCustomStartDate] = useState(() => (
    validDateInput(initialParams.get('startDate'), defaultStart)
  ));
  const [customEndDate, setCustomEndDate] = useState(() => initialEndDate);
  const scopeInitialized = useRef(false);
  const [scopeReady, setScopeReady] = useState(false);
  const requestedLens = useMemo(() => parseLens(initialParams.get('lens')), []);

  useEffect(() => {
    if (scopeInitialized.current) return;
    scopeInitialized.current = true;
    if (requestedLens && requestedLens !== analyticsLens) {
      onAnalyticsLensChange(requestedLens);
    }
    setScopeReady(true);
  }, [analyticsLens, onAnalyticsLensChange, requestedLens]);

  const { start, end, periodLabel } = useMemo(
    () => getRangeDates(range, anchorYear, anchorMonth, customStartDate, customEndDate),
    [range, anchorYear, anchorMonth, customStartDate, customEndDate],
  );
  const report = useMemo(
    () => getCategoryReport(transactions, category, start, end, analyticsLens),
    [transactions, category, start, end, analyticsLens],
  );
  const knownCategory = categories.includes(category)
    || archivedCategories.includes(category)
    || transactions.some((transaction) => transaction.category === category);

  useEffect(() => {
    if (!scopeReady) return;
    const params = new URLSearchParams({
      range,
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
      lens: analyticsLens,
    });
    const nextSearch = `?${params.toString()}`;
    if (location.search !== nextSearch) {
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    }
  }, [analyticsLens, end, location.pathname, location.search, navigate, range, scopeReady, start]);

  if (!knownCategory) {
    return (
      <div className="space-y-4 pb-24">
        <Link
          to="/reports/categories"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to categories
        </Link>
        <div className="aura-section-surface px-5 py-12 text-center">
          <p className="text-sm font-bold text-on-surface">Category not found</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            It may have been renamed since this report link was created.
          </p>
        </div>
      </div>
    );
  }

  const historyPath = `/transactions?category=${encodeURIComponent(category)}&startDate=${formatDateInput(start)}&endDate=${formatDateInput(end)}&preset=custom&lens=${analyticsLens}`;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/reports/categories"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ArrowLeft className="h-4 w-4" />
          Categories
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <CategoryBadge category={category} size="sm" />
          <h2 className="truncate text-sm font-extrabold text-on-surface">{category}</h2>
        </div>
      </div>

      <PeriodSelector
        range={range}
        lens={analyticsLens}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        periodLabel={periodLabel}
        onRangeChange={setRange}
        onLensChange={onAnalyticsLensChange}
        showLensControl={false}
        onCustomDatesChange={(nextStart, nextEnd) => {
          setCustomStartDate(nextStart);
          setCustomEndDate(nextEnd);
        }}
      />

      <FocalSummaryCard>
        <div>
          <p className="text-xs font-semibold text-inverse-on-surface-variant">Spent on {category}</p>
          <p className="mt-1 font-headline text-4xl font-extrabold tabular-nums text-inverse-on-surface">
            {formatCurrency(report.selectedTotal)}
          </p>
          <p className="mt-1 text-xs text-inverse-on-surface-variant">{periodLabel}</p>
        </div>
        <div className="border-t border-white/12 pt-3">
          {report.monthlyAverage !== null ? (
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-inverse-on-surface-variant">Monthly average</p>
                <p className="mt-0.5 text-lg font-extrabold tabular-nums text-inverse-on-surface">
                  {formatCurrency(report.monthlyAverage)}
                </p>
              </div>
              <p className="text-right text-[10px] font-semibold text-inverse-on-surface-variant">
                {report.completeMonthCount} complete months
              </p>
            </div>
          ) : (
            <p className="text-xs font-semibold text-inverse-on-surface-variant">
              Two complete months are needed for a monthly average.
            </p>
          )}
        </div>
      </FocalSummaryCard>

      <section className="space-y-3" aria-labelledby="category-trend-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 id="category-trend-title" className="text-sm font-bold text-on-surface">
              Monthly trend
            </h3>
            <p className="mt-0.5 text-[10px] font-semibold text-on-surface-variant">
              Actual category spending; partial months are not projected.
            </p>
          </div>
          {report.monthlyPoints.some((point) => point.isPartial) && (
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-on-surface-variant">
              <CircleDashed className="h-3.5 w-3.5" />
              Partial
            </span>
          )}
        </div>

        <div
          className="h-64 w-full"
          role="img"
          aria-label={`Monthly spending trend for ${category}, ${periodLabel}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={report.monthlyPoints} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
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
                tickFormatter={(value) => `€${Math.round(value)}`}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2.5 text-xs shadow-md">
                      <p className="font-bold text-on-surface">{label}{point.isPartial ? ' · Partial' : ''}</p>
                      <p className="mt-1 font-extrabold text-primary">{formatCurrency(point.amount)}</p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                name="Spending"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={({ cx, cy, payload }: any) => (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.isPartial ? 4 : 3}
                    fill={payload.isPartial ? 'var(--color-surface)' : 'var(--color-primary)'}
                    stroke="var(--color-primary)"
                    strokeWidth={payload.isPartial ? 2 : 1}
                  />
                )}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ul className="sr-only">
          {report.monthlyPoints.map((point) => (
            <li key={point.key}>
              {point.label}: {formatCurrency(point.amount)}{point.isPartial ? ', partial month' : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="divide-y divide-outline-variant/20" aria-labelledby="top-transactions-title">
        <div className="flex items-end justify-between gap-3 py-3">
          <div>
            <h3 id="top-transactions-title" className="text-sm font-bold text-on-surface">
              Top transactions
            </h3>
            <p className="mt-0.5 text-[10px] font-semibold text-on-surface-variant">
              Largest impacts in the selected period
            </p>
          </div>
          <span className="text-[10px] font-bold text-on-surface-variant">
            {report.topTransactions.length} shown
          </span>
        </div>
        {report.topTransactions.map((transaction) => {
          const isReimbursement = getTransactionReportingClass(transaction) === 'reimbursement';
          return (
            <div key={transaction.id} className="flex items-center gap-3 py-3">
              <CategoryBadge category={transaction.category} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-on-surface">{transaction.title || transaction.category}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-on-surface-variant">
                  {formatDate(transaction.date)}{isReimbursement ? ' · Reimbursement' : ''}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-extrabold tabular-nums ${isReimbursement ? 'text-secondary' : 'text-tertiary'}`}>
                {isReimbursement ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>
          );
        })}
        {report.topTransactions.length === 0 && (
          <p className="py-8 text-center text-xs font-semibold text-on-surface-variant">
            No category transactions in this period.
          </p>
        )}
      </section>

      <Link
        to={historyPath}
        className="flex min-h-11 w-full items-center justify-between rounded-xl px-1 text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        View all {category} transactions
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
