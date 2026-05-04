import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Lightbulb, Plus, Wallet, PieChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { Card, EmptyState, Skeleton } from '../components/ui';
import { Sparkline } from '../components/Sparkline';
import { RadialGauge } from '../components/RadialGauge';
import { useBudgetAlerts } from '../hooks/useBudgetAlerts';
import { useRecurringAutoGenerate } from '../hooks/useRecurringAutoGenerate';
import { formatMonthLabel } from '../domain/finance';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { pageTransition } from '../utils/motion';
import { TransactionQuickEditDialog } from '../components/TransactionQuickEditDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Transaction } from '../types';
import { haptics } from '../utils/haptics';
import { useToast } from '../components/Toast';

const DONUT_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-tertiary)',
  'var(--color-accent-purple)',
  'var(--color-accent-amber)',
  'var(--color-accent-cyan)',
];

export const Dashboard = () => {
  const {
    transactions, setTransactions, budgets, recurring,
    currentBalance, monthlyTotals, monthlyBudget,
    safeToSpend, categorySpending, momChange, recentTransactions, isHydrated,
    categories, addCategory, selectedMonth, setSelectedMonth
  } = useApp();
  const { toast } = useToast();

  // Side-effect hooks (UI-level orchestration)
  useRecurringAutoGenerate(recurring, transactions, setTransactions);
  useBudgetAlerts(budgets, transactions);

  // Derived from context
  const { income: monthlyIncome, expenses: monthlyExpenses } = monthlyTotals;
  const monthlySavings = Math.max(0, monthlyTotals.net);
  const { remaining: safeAmount, usedPercent } = safeToSpend;
  const totalSpent = categorySpending.reduce((acc, c) => acc + c.amount, 0);
  const animatedBalance = useAnimatedNumber(currentBalance);
  const animatedSafeAmount = useAnimatedNumber(safeAmount);
  const [barsMounted, setBarsMounted] = useState(false);
  const [quickEditTransaction, setQuickEditTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setBarsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handlePrevMonth = () => {
    const prev = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    setSelectedMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    setSelectedMonth(next);
  };

  const getReferenceDate = () => {
    const now = new Date();
    if (selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth()) {
      return now;
    }
    return new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
  };

  const weeklyIncome = Array.from({ length: 7 }, (_, index) => {
    const date = getReferenceDate();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return transactions
      .filter((transaction) => transaction.date.slice(0, 10) === key && transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  });
  const weeklyExpenses = Array.from({ length: 7 }, (_, index) => {
    const date = getReferenceDate();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return transactions
      .filter((transaction) => transaction.date.slice(0, 10) === key && transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  });

  // Donut segments
  const donutSegments = categorySpending.map((cat, i) => ({
    ...cat,
    label: cat.category,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const saveQuickEdit = (nextTransaction: Transaction) => {
    setTransactions(transactions.map((transaction) => (
      transaction.id === nextTransaction.id ? nextTransaction : transaction
    )));
    setQuickEditTransaction(null);
    haptics.success();
    toast('Transaction updated', 'success');
  };

  const handleDeleteTransaction = (id: string) => {
    const deleted = transactions.find(t => t.id === id);
    if (!deleted) return;
    
    setTransactions(transactions.filter(t => t.id !== id));
    setTransactionToDelete(null);
    haptics.warning();
    toast('Transaction deleted', 'info', 5000, {
      label: 'Undo',
      onClick: () => {
        setTransactions([...transactions, deleted]);
        haptics.success();
      }
    });
  };

  // Build donut arcs
  let cumulativeOffset = 0;
  const CIRCUMFERENCE = 251.2;

  return (
    <motion.div 
      {...pageTransition}
      className="space-y-4 pb-24"
    >
      {/* Hero: Balance */}
      <section className="flex flex-col gap-4">
        <div className="space-y-0.5">
          <p className="text-on-surface-variant text-xs font-bold">Total Balance</p>
          <div className="flex items-baseline gap-2">
            {isHydrated ? (
              <h2 className="text-4xl sm:text-5xl font-headline font-extrabold tracking-tighter text-primary">
                {formatCurrency(animatedBalance)}
              </h2>
            ) : (
              <Skeleton className="h-12 w-56" />
            )}
            {momChange !== null && (
              <div className={cn(
                "px-2 py-0.5 rounded-full flex items-center gap-1",
                momChange >= 0 ? "bg-secondary-container/20" : "bg-tertiary/10"
              )}>
                {momChange >= 0
                  ? <TrendingDown className="w-3 h-3 text-secondary" />
                  : <TrendingUp className="w-3 h-3 text-tertiary" />
                }
                <span className={cn("font-bold text-xs", momChange >= 0 ? "text-secondary" : "text-tertiary")}>
                  {momChange >= 0 ? '-' : '+'}{Math.abs(momChange).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-surface-container-high transition-colors" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4 text-on-surface-variant" />
            </button>
            <p className="text-on-surface-variant text-sm font-bold min-w-[100px] text-center">{formatMonthLabel(selectedMonth)}</p>
            <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-surface-container-high transition-colors" aria-label="Next month">
              <ChevronRight className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Safe to Spend — promoted to primary position */}
        <Card className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-on-surface-variant text-xs mb-2 font-bold">Safe to Spend</h3>
              {isHydrated ? (
                <p className={cn(
                  "text-3xl font-headline font-bold",
                  usedPercent > 90 ? "text-tertiary" : "text-secondary"
                )}>
                  {formatCurrency(animatedSafeAmount)}
                </p>
              ) : (
                <Skeleton className="h-9 w-36" />
              )}
              <p className="text-on-surface-variant text-xs">of {formatCurrency(monthlyBudget)} monthly budget</p>
            </div>
            <div className="mx-auto sm:mx-0">
              <RadialGauge percent={usedPercent} value={`${usedPercent}%`} label="used" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  usedPercent > 90 ? "bg-tertiary shadow-[0_0_10px_rgba(220,38,38,0.3)]" :
                  usedPercent > 75 ? "bg-accent-amber shadow-[0_0_10px_rgba(245,158,11,0.3)]" :
                  "bg-secondary shadow-[0_0_10px_rgba(74,222,128,0.3)]"
                )}
                style={{ width: barsMounted ? `${Math.min(100, usedPercent)}%` : '0%' }}
              ></div>
            </div>
            <div className="flex justify-between text-xs font-bold text-on-surface-variant">
              <span>{usedPercent}% used</span>
              <span>{100 - Math.min(100, usedPercent)}% remaining</span>
            </div>
          </div>
        </Card>
      </section>

      {/* Income / Expenses grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container-low p-5 rounded-3xl border-none">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-secondary rotate-180" />
            </div>
            <Sparkline values={weeklyIncome} color="var(--color-secondary)" label="Income over the last 7 days" />
          </div>
          <h3 className="text-on-surface-variant text-xs mb-1 font-bold">Income</h3>
          <p className="text-2xl font-headline font-bold text-on-surface">{formatCurrency(monthlyIncome)}</p>
        </div>

        <div className="bg-surface-container-low p-5 rounded-3xl border-none">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-tertiary" />
            </div>
            <Sparkline values={weeklyExpenses} color="var(--color-tertiary)" label="Expenses over the last 7 days" />
          </div>
          <h3 className="text-on-surface-variant text-xs mb-1 font-bold">Expenses</h3>
          <p className="text-2xl font-headline font-bold text-on-surface">{formatCurrency(monthlyExpenses)}</p>
        </div>
      </div>

      {/* Spending by Category — multi-color donut */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-on-surface font-headline font-bold text-base">Spending by Category</h3>
          <span className="text-xs font-bold text-on-surface-variant">{formatMonthLabel(selectedMonth)}</span>
        </div>
        {categorySpending.length > 0 ? (
          <div className="flex flex-col gap-6">
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label={`Spending by category total ${formatCurrency(totalSpent)}`}>
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="var(--color-surface-container-highest)" strokeWidth="12" />
                {donutSegments.map((seg) => {
                  const dashLength = CIRCUMFERENCE * seg.percentage;
                  const offset = CIRCUMFERENCE - cumulativeOffset;
                  cumulativeOffset += dashLength;
                  return (
                    <circle
                      key={seg.label}
                      cx="50" cy="50" fill="transparent" r="40"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  );
                })}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-micro text-on-surface-variant font-bold">Total</span>
                <span className="text-base font-headline font-bold text-on-surface">{formatCurrency(totalSpent)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {categorySpending.slice(0, 6).map((cat, i) => (
                <div key={cat.category} className="flex items-center justify-between bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5">
                  <div className="flex items-center gap-3">
                    <CategoryBadge category={cat.category} size="md" className="flex-shrink-0" />
                    <span className="text-sm text-on-surface font-bold">{cat.category}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-headline font-extrabold text-sm text-on-surface">{formatCurrency(cat.amount)}</span>
                    <span className="text-xs font-medium text-on-surface-variant/60">{totalSpent > 0 ? Math.round((cat.amount / totalSpent) * 100) : 0}% of total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<PieChart className="w-10 h-10" />}
            title="No expenses this month"
            description="Add your first expense to see category breakdowns here."
            action={{ label: 'Add transaction', to: '/add' }}
          />
        )}
      </Card>

      {/* Savings insight — compact, moved below */}
      {monthlySavings > 0 && (
        <div className="bg-secondary/5 border border-secondary/10 p-4 rounded-2xl flex items-center gap-3">
          <Lightbulb className="w-5 h-5 text-secondary flex-shrink-0" />
          <p className="text-sm text-on-surface font-medium">
            You've saved <span className="text-secondary font-bold">{formatCurrency(monthlySavings)}</span> this month!
          </p>
        </div>
      )}

      {/* Recent Transactions — sorted by date */}
      <section className="bg-surface-container-low rounded-3xl p-5">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-base font-headline font-bold text-primary">Recent Transactions</h3>
            <p className="text-on-surface-variant text-xs">Latest movements</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/add" className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all">
              <Plus className="w-3.5 h-3.5" />
              Add
            </Link>
            <Link to="/history" className="bg-surface-container-lowest text-primary px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all">
              View All
            </Link>
          </div>
        </div>
        <div className="space-y-1.5">
          {recentTransactions.length > 0 ? recentTransactions.map((t) => (
            <button
              key={t.id}
              onClick={() => setQuickEditTransaction(t)}
              className="flex w-full items-center gap-3 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/5 text-left active:scale-[0.98] transition-all"
            >
              <CategoryBadge category={t.category} size="md" className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-surface truncate">{t.title}</p>
                <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">{t.category} • {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <div className="flex flex-col items-end">
                  <p className={cn('text-sm font-extrabold', t.type === 'income' ? 'text-secondary' : 'text-on-surface')}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                </div>
              </div>
            </button>
          )) : (
            <EmptyState
              icon={<Wallet className="w-10 h-10" />}
              title="No transactions yet"
              description="Start with an income or expense to populate your dashboard."
              action={{ label: 'Add transaction', to: '/add' }}
            />
          )}
        </div>
      </section>

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
    </motion.div>
  );
};
