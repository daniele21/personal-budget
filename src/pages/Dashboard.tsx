import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import {
  Card,
  EmptyState,
  LensSelector,
  Skeleton,
} from '../components/ui';
import { RadialGauge } from '../components/RadialGauge';
import { CashFlowPreview } from '../components/dashboard/CashFlowPreview';
import { useBudgetAlerts } from '../hooks/useBudgetAlerts';
import {
  calculateBudgetableCashInflowByLens,
  calculateTotalsByLens,
  filterByAnalyticsLens,
  formatMonthLabel,
  safeToSpend as calculateSafeToSpend,
} from '../domain/finance';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { pageTransition } from '../utils/motion';
import { TransactionQuickEditDialog } from '../components/TransactionQuickEditDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TransactionDetailSheet } from '../components/transactions/TransactionDetailSheet';
import { Transaction } from '../types';
import { haptics } from '../utils/haptics';
import { useToast } from '../components/Toast';
import { ExtraTransactionBadge } from '../components/ExtraTransactionBadge';

// ─── Dashboard ──────────────────────────────────────────────────────────────

export const Dashboard = () => {
  const {
    transactions,
    setTransactions,
    budgets,
    monthlyBudget,
    monthlyTransactions,
    momChange,
    recentTransactions,
    isHydrated,
    categories,
    addCategory,
    selectedMonth,
    setSelectedMonth,
    analyticsLens: lens,
    setAnalyticsLens: setLens,
  } = useApp();
  const { toast } = useToast();

  // Side-effect hooks (budget alerts)
  useBudgetAlerts(budgets, transactions);

  // ── Derived state ─────────────────────────────────────────────────
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [quickEditTransaction, setQuickEditTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const filteredTransactions = useMemo(
    () => filterByAnalyticsLens(transactions, lens),
    [transactions, lens],
  );
  const safeToSpendTotals = useMemo(
    () => calculateTotalsByLens(monthlyTransactions, lens),
    [monthlyTransactions, lens],
  );
  const safeToSpendIncomeCap = useMemo(
    () => calculateBudgetableCashInflowByLens(monthlyTransactions, lens),
    [monthlyTransactions, lens],
  );
  const safeToSpendData = useMemo(
    () => calculateSafeToSpend(monthlyBudget, safeToSpendTotals.expenses, safeToSpendIncomeCap),
    [monthlyBudget, safeToSpendTotals.expenses, safeToSpendIncomeCap],
  );
  const { remaining: safeAmount, usedPercent, effectiveLimit } = safeToSpendData;
  const animatedSafeAmount = useAnimatedNumber(safeAmount);
  const isOverBudget = safeToSpendTotals.expenses > effectiveLimit;
  const homeInsights = [
    isOverBudget ? `Spending is ${formatCurrency(safeToSpendTotals.expenses - effectiveLimit)} over the monthly limit.` : null,
    !isOverBudget && usedPercent >= 80 ? `${usedPercent}% of the monthly limit has been used.` : null,
    momChange !== null && Math.abs(momChange) >= 10
      ? `Net cash flow is ${Math.abs(momChange).toFixed(0)}% ${momChange >= 0 ? 'higher' : 'lower'} than last month.`
      : null,
  ].filter((insight): insight is string => insight !== null).slice(0, 2);

  const today = new Date();
  const isCurrentMonth =
    selectedMonth.getFullYear() === today.getFullYear() &&
    selectedMonth.getMonth() === today.getMonth();
  const daysInSelectedMonth = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0,
  ).getDate();
  const daysRemaining = isCurrentMonth
    ? Math.max(0, daysInSelectedMonth - today.getDate())
    : daysInSelectedMonth;

  // ── Month navigation ───────────────────────────────────────────────
  const handlePrevMonth = () => {
    const prev = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    setSelectedMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    setSelectedMonth(next);
  };

  // ── Transaction handlers ───────────────────────────────────────────
  const saveQuickEdit = (nextTransaction: Transaction) => {
    setTransactions(transactions.map((t) => (t.id === nextTransaction.id ? nextTransaction : t)));
    setQuickEditTransaction(null);
    haptics.success();
    toast('Transaction updated', 'success');
  };

  const handleDeleteTransaction = (id: string) => {
    const deleted = transactions.find((t) => t.id === id);
    if (!deleted) return;
    const remaining = transactions.filter((t) => t.id !== id);
    setTransactions(remaining);
    setTransactionToDelete(null);
    haptics.warning();
    toast('Transaction deleted', 'info', 5000, {
      label: 'Undo',
      onClick: () => {
        setTransactions([...remaining, deleted]);
        haptics.success();
      },
    });
  };

  // ── Group recent transactions by date label ────────────────────────
  const groupedRecent = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const groups: { label: string; transactions: Transaction[] }[] = [];
    const seen = new Map<string, number>();

    for (const t of recentTransactions) {
      const txDate = new Date(`${t.date.slice(0, 10)}T00:00:00`);
      let label: string;
      if (txDate.toDateString() === today.toDateString()) label = 'Today';
      else if (txDate.toDateString() === yesterday.toDateString()) label = 'Yesterday';
      else label = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!seen.has(label)) {
        seen.set(label, groups.length);
        groups.push({ label, transactions: [] });
      }
      groups[seen.get(label)!].transactions.push(t);
    }
    return groups;
  }, [recentTransactions]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div {...pageTransition} className="space-y-3 pb-24">
      {/* ── 1. Month navigator ─────────────────────────────────────────── */}
      <div className="aura-control-surface flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5">
        <button onClick={handlePrevMonth} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/6 text-primary transition-colors hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4 text-primary" />
        </button>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2">
          <div className="shrink-0 text-center">
            <p className="text-sm font-semibold text-primary">{formatMonthLabel(selectedMonth)}</p>
          </div>
          <LensSelector value={lens} onChange={setLens} className="mx-0 max-w-[9.25rem] shrink-0" />
        </div>
        <button onClick={handleNextMonth} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/6 text-primary transition-colors hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25" aria-label="Next month">
          <ChevronRight className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* ── 2. Safe to Spend Hero ─────────────────────────────────────── */}
      <Link to="/budgets" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:opacity-90">
        <Card
          variant="inverse"
          tone={isOverBudget ? 'danger' : usedPercent > 80 ? 'warning' : 'primary'}
          className="py-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-headline text-sm font-medium text-inverse-on-surface-variant">Available to spend</h2>
                <Info className="h-3.5 w-3.5 text-inverse-on-surface-variant/70" />
              </div>
              {isHydrated ? (
                <p
                  className={cn(
                    'font-headline text-4xl font-bold leading-none tracking-tight tabular-nums',
                    'text-inverse-on-surface',
                  )}
                >
                  {formatCurrency(animatedSafeAmount)}
                </p>
              ) : (
                <Skeleton className="h-10 w-32 bg-white/15" />
              )}
              <p className="text-xs font-normal text-inverse-on-surface-variant">
                {formatCurrency(safeToSpendTotals.expenses)} spent of {formatCurrency(effectiveLimit)}
              </p>
              <p className="text-xs font-normal text-inverse-on-surface-variant">
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </p>
            </div>
            {/* Gauge with hidden text labels below it for mockup matching */}
            <div className="shrink-0 scale-90 origin-right">
              <RadialGauge percent={usedPercent} value={`${usedPercent}%`} label="used" hideText inverse />
              <p className={cn(
                'mt-1 justify-center text-center text-xs',
                isOverBudget ? 'aura-status-danger' : usedPercent > 80 ? 'aura-status-warning' : 'aura-status-primary',
              )}>
                {usedPercent}% used · {isOverBudget ? 'Over budget' : 'On track'}
              </p>
            </div>
          </div>
        </Card>
      </Link>

      {/* ── 3. Monthly summary ─────────────────────────────────────────── */}
      <Card className="grid grid-cols-2 p-0">
        <Link to="/transactions?type=income" className="aura-metric-positive min-w-0 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-on-surface-variant">Income</p>
            </div>
            <p className="mt-1 truncate text-base font-semibold text-secondary">
                {isHydrated ? formatCurrency(safeToSpendTotals.income) : <Skeleton className="h-4 w-12" />}
            </p>
        </Link>
        <Link to="/transactions?type=expense" className="aura-metric-divider aura-metric-neutral relative min-w-0 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-on-surface-variant">Spent</p>
            </div>
            <p className="mt-1 truncate text-base font-semibold text-on-surface">
                {isHydrated ? formatCurrency(safeToSpendTotals.expenses) : <Skeleton className="h-4 w-12" />}
            </p>
        </Link>
      </Card>

      {/* ── 5. Cash flow chart ─────────────────────────────────────────── */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-base font-semibold text-on-surface">Cash flow</h3>
          <span className="text-xs font-medium text-on-surface-variant">
            {formatMonthLabel(selectedMonth)}
          </span>
        </div>
        <CashFlowPreview
          transactions={filteredTransactions}
          month={selectedMonth}
          netAmount={safeToSpendTotals.net}
          momChange={momChange}
        />
        <div className="aura-divider-top mt-1 flex justify-end pt-3">
          <Link
            to="/reports"
            className="text-sm font-medium text-primary hover:underline"
          >
            View report
          </Link>
        </div>
      </Card>

      {homeInsights.length > 0 && (
        <section className="space-y-2 px-1" aria-label="Monthly insights">
          <h3 className="text-sm font-semibold text-on-surface">Worth noting</h3>
          <ul className="space-y-1.5">
            {homeInsights.map((insight) => (
              <li key={insight} className="border-l-2 border-primary/30 pl-3 text-xs leading-relaxed text-on-surface-variant">{insight}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 8. Recent transactions ─────────────────────────────────────── */}
      <section className="aura-card p-4" aria-label="Recent transactions">
        <div className="mb-2 flex items-center justify-between">
            <h3 className="font-headline text-base font-semibold text-on-surface">Recent transactions</h3>
            <Link
              to="/transactions"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
        </div>

        {groupedRecent.length > 0 ? (
          <div className="space-y-1">
            {groupedRecent.map((group) => (
              <div key={group.label}>
                {(() => {
                  const netTotal = group.transactions.reduce(
                    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
                    0,
                  );
                  return (
                    <div className="tx-date-group">
                      <span>{group.label}</span>
                      <span className="text-xs font-medium text-on-surface-variant/60 tabular-nums">
                        {netTotal >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(netTotal))}
                      </span>
                    </div>
                  );
                })()}

                {/* Transactions — hairline divider on wrapper, flex layout on button */}
                {group.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="border-b border-outline-variant/20 last:border-b-0"
                  >
                    <button
                      onClick={() => setDetailTransaction(t)}
                      className="flex w-full items-center gap-2.5 bg-transparent px-1 py-2.5 text-left transition-colors active:bg-surface-container-low"
                    >
                      <CategoryBadge category={t.category} size="md" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="min-w-0 truncate text-sm font-semibold text-on-surface">
                            {t.title}
                          </p>
                          <ExtraTransactionBadge transaction={t} className="shrink-0" />
                        </div>
                        <p className="text-xs font-medium text-on-surface-variant">
                          {t.category}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'shrink-0 text-sm font-semibold tabular-nums',
                          t.type === 'income' ? 'text-secondary' : 'text-on-surface',
                        )}
                      >
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Wallet className="h-10 w-10" />}
            title="No transactions yet"
            description="Start with an income or expense to populate your dashboard."
            action={{ label: 'Add transaction', to: '/add' }}
          />
        )}
      </section>

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={transactionToDelete !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => transactionToDelete && handleDeleteTransaction(transactionToDelete)}
        onCancel={() => setTransactionToDelete(null)}
      />
      <TransactionQuickEditDialog
        transaction={quickEditTransaction}
        categories={categories}
        onAddCategory={addCategory}
        onClose={() => setQuickEditTransaction(null)}
        onSave={saveQuickEdit}
        onDelete={(id) => {
          setQuickEditTransaction(null);
          setTransactionToDelete(id);
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
          setTransactionToDelete(id);
        }}
      />
    </motion.div>
  );
};
