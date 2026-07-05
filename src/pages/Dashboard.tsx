import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Lightbulb,
  Plus,
  ReceiptText,
  TrendingUp,
  Wallet,
  WalletCards,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import {
  Card,
  CompactMetricCard,
  EmptyState,
  IconAction,
  LensSelector,
  Skeleton,
} from '../components/ui';
import { RadialGauge } from '../components/RadialGauge';
import { CashFlowChart } from '../components/dashboard/CashFlowChart';
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
    monthlyTotals,
    monthlyBudget,
    monthlyTransactions,
    momChange,
    recentTransactions,
    isHydrated,
    categories,
    addCategory,
    selectedMonth,
    setSelectedMonth,
  } = useApp();
  const { toast } = useToast();

  // Side-effect hooks (budget alerts)
  useBudgetAlerts(budgets, transactions);

  // ── Derived state ─────────────────────────────────────────────────
  const { income: monthlyIncome, expenses: monthlyExpenses } = monthlyTotals;
  const animatedBalance = useAnimatedNumber(monthlyTotals.net);
  const [barsMounted, setBarsMounted] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [quickEditTransaction, setQuickEditTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [lens, setLens] = useState<'actual' | 'normalized'>('actual');

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

  useEffect(() => {
    const frame = requestAnimationFrame(() => setBarsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
    setTransactions(transactions.filter((t) => t.id !== id));
    setTransactionToDelete(null);
    haptics.warning();
    toast('Transaction deleted', 'info', 5000, {
      label: 'Undo',
      onClick: () => {
        setTransactions([...transactions, deleted]);
        haptics.success();
      },
    });
  };

  // ── Compute MoM trend numbers for cards ───────────────────────────
  const incomeTrend = momChange !== null ? momChange : null;
  const expenseTrend = momChange !== null ? -momChange : null;

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
      {/* ── 1. Safe to Spend Hero ─────────────────────────────────────── */}
      <Link to="/budgets" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-3xl transition-transform active:scale-[0.99]">
        <Card variant="elevated" className="space-y-2 py-3 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-headline text-xs font-bold text-on-surface-variant">Safe to spend</h2>
                <Info className="h-3.5 w-3.5 text-on-surface-variant/60" />
              </div>
              {isHydrated ? (
                <p
                  className={cn(
                    'font-headline text-3xl font-extrabold leading-none tabular-nums',
                    usedPercent > 90 ? 'text-tertiary' : 'text-primary',
                  )}
                >
                  {formatCurrency(animatedSafeAmount)}
                </p>
              ) : (
                <Skeleton className="h-10 w-32" />
              )}
              <p className="text-[10px] font-bold text-on-surface-variant">
                of {formatCurrency(effectiveLimit)}
              </p>
            </div>
            {/* Gauge with hidden text labels below it for mockup matching */}
            <div className="shrink-0 scale-95 origin-right">
              <RadialGauge percent={usedPercent} value={`${usedPercent}%`} label="used" hideText />
            </div>
          </div>
        </Card>
      </Link>

      {/* ── 2. Month navigator ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface-container-low px-3 py-2">
        <button
          onClick={handlePrevMonth}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4 text-primary" />
        </button>
        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2">
          <div className="shrink-0 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
              Monthly snapshot
            </p>
            <p className="text-sm font-extrabold text-primary">{formatMonthLabel(selectedMonth)}</p>
          </div>
          <LensSelector value={lens} onChange={setLens} className="mx-0 max-w-[9.25rem] shrink-0" />
        </div>
        <button
          onClick={handleNextMonth}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* ── 3. Income / Spent / Remaining row ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <Link to="/history" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl transition-all active:scale-[0.97]">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3 flex flex-col justify-between min-h-[68px] hover:border-outline-variant/45 hover:shadow-sm">
            <p className="text-[10px] font-bold text-on-surface-variant leading-tight">Income this month</p>
            <div className="flex items-center justify-between mt-1 gap-1">
              <span className="text-sm font-extrabold text-secondary truncate">
                {isHydrated ? formatCurrency(safeToSpendTotals.income) : <Skeleton className="h-4 w-12" />}
              </span>
              <TrendingUp className="h-3 w-3 text-secondary shrink-0" />
            </div>
          </div>
        </Link>
        <Link to="/history" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl transition-all active:scale-[0.97]">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3 flex flex-col justify-between min-h-[68px] hover:border-outline-variant/45 hover:shadow-sm">
            <p className="text-[10px] font-bold text-on-surface-variant leading-tight">Spent</p>
            <div className="mt-1">
              <span className="text-sm font-extrabold text-tertiary truncate">
                {isHydrated ? formatCurrency(safeToSpendTotals.expenses) : <Skeleton className="h-4 w-12" />}
              </span>
            </div>
          </div>
        </Link>
        <Link to="/budgets" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl transition-all active:scale-[0.97]">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3 flex flex-col justify-between min-h-[68px] hover:border-outline-variant/45 hover:shadow-sm">
            <p className="text-[10px] font-bold text-on-surface-variant leading-tight">Remaining</p>
            <div className="mt-1">
              <span className="text-sm font-extrabold text-on-surface truncate">
                {isHydrated ? formatCurrency(safeAmount) : <Skeleton className="h-4 w-12" />}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── 5. Cash flow chart ─────────────────────────────────────────── */}
      <Card variant="elevated" className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-sm font-bold text-on-surface">Cash flow overview</h3>
          <span className="text-[10px] font-bold text-on-surface-variant">
            {formatMonthLabel(selectedMonth)}
          </span>
        </div>
        <CashFlowChart
          transactions={filteredTransactions}
          month={selectedMonth}
          netAmount={monthlyTotals.net}
          momChange={momChange}
        />
        <div className="border-t border-outline-variant/20 pt-3 mt-1 flex justify-end">
          <Link
            to="/insights"
            className="flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline"
          >
            See insights
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3 3v18h18M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>

      {/* ── 7. Savings insight ─────────────────────────────────────────── */}
      {monthlyTotals.net > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-secondary/15 bg-secondary/5 p-3">
          <Lightbulb className="h-4 w-4 shrink-0 text-secondary" />
          <p className="text-sm font-medium text-on-surface">
            You saved{' '}
            <span className="font-bold text-secondary">{formatCurrency(monthlyTotals.net)}</span>{' '}
            this month.
          </p>
        </div>
      )}

      {/* ── 8. Recent transactions ─────────────────────────────────────── */}
      <section className="aura-card p-4" aria-label="Recent transactions">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="font-headline text-base font-bold text-primary">Recent Transactions</h3>
            <p className="text-xs font-medium text-on-surface-variant">Latest movements</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/add"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-on-primary shadow-sm transition-all hover:bg-primary-container hover:shadow-md"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Link>
            <Link
              to="/history"
              className="rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition-all hover:bg-surface-container-high hover:shadow-md"
            >
              View All
            </Link>
          </div>
        </div>

        {groupedRecent.length > 0 ? (
          <div className="space-y-1">
            {groupedRecent.map((group) => (
              <div key={group.label}>
                {/* Date group header */}
                <div className="tx-date-group">
                  <span>{group.label}</span>
                  <span className="text-on-surface-variant/60">
                    {formatCurrency(
                      group.transactions.reduce(
                        (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
                        0,
                      ),
                    )}
                  </span>
                </div>

                {/* Transactions — hairline divider on wrapper, flex layout on button */}
                {group.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="border-b border-outline-variant/20 last:border-b-0"
                  >
                    <button
                      onClick={() => setDetailTransaction(t)}
                      className="flex w-full items-center gap-2.5 bg-surface px-1 py-2.5 text-left transition-colors active:bg-surface-container-low"
                    >
                      <CategoryBadge category={t.category} size="md" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="min-w-0 truncate text-sm font-bold text-on-surface">
                            {t.title}
                          </p>
                          <ExtraTransactionBadge transaction={t} className="shrink-0" />
                        </div>
                        <p className="text-[10px] font-medium text-on-surface-variant">
                          {t.category}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'shrink-0 text-sm font-extrabold tabular-nums',
                          t.type === 'income' ? 'text-secondary' : 'text-tertiary',
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
