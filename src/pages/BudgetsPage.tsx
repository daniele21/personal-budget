import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight, PieChart, Plus, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import {
  calculateBudgetableCashInflowByLens,
  calculateTotals,
  calculateTotalsByLens,
  filterByAnalyticsLens,
  formatMonthLabel,
  safeToSpend as calculateSafeToSpend,
} from '../domain/finance';
import { CategoryPicker } from '../components/CategoryPicker';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { Card, Button, EmptyState, LensSelector } from '../components/ui';
import { ProgressRow } from '../components/ui/ProgressRow';
import { RadialGauge } from '../components/RadialGauge';
import { haptics } from '../utils/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { pageTransition } from '../utils/motion';
import { getCategoryTheme } from '../config/categoryThemes';

// ─── BudgetsPage ──────────────────────────────────────────────────────────

export const BudgetsPage = () => {
  const { toast } = useToast();
  const {
    budgets,
    setBudgets,
    categories,
    addCategory,
    monthlyTransactions,
    monthlyBudget,
    selectedMonth,
  } = useApp();

  const [lens, setLens] = useState<'actual' | 'normalized'>('actual');
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [newLimit, setNewLimit] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isLimitKeypadOpen, setIsLimitKeypadOpen] = useState(false);
  const [barsMounted, setBarsMounted] = useState(false);
  const budgetDialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(budgetDialogRef, isAdding, () => setIsAdding(false));

  useEffect(() => {
    const frame = requestAnimationFrame(() => setBarsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────
  const getSpentForCategory = (category: string, selectedLens: 'actual' | 'normalized' = lens) =>
    calculateTotals(
      filterByAnalyticsLens(monthlyTransactions, selectedLens).filter((t) => t.category === category),
    ).expenses;

  const getNormalizedSpentForCategory = (category: string) =>
    getSpentForCategory(category, 'normalized');

  const safeToSpendTotals = useMemo(
    () => calculateTotalsByLens(monthlyTransactions, lens),
    [monthlyTransactions, lens],
  );
  const safeToSpendIncomeCap = useMemo(
    () => calculateBudgetableCashInflowByLens(monthlyTransactions, lens),
    [monthlyTransactions, lens],
  );
  const safeToSpend = useMemo(
    () => calculateSafeToSpend(monthlyBudget, safeToSpendTotals.expenses, safeToSpendIncomeCap),
    [monthlyBudget, safeToSpendTotals.expenses, safeToSpendIncomeCap],
  );

  // ── Budget CRUD ──────────────────────────────────────────────────────
  const handleAddBudget = () => {
    const parsedLimit = parseFloat(newLimit);
    if (!newLimit || isNaN(parsedLimit) || parsedLimit <= 0) {
      toast('Please enter a valid limit greater than 0', 'warning');
      return;
    }

    const existingIndex = budgets.findIndex((b) => b.category === newCategory);
    if (existingIndex > -1) {
      const updated = [...budgets];
      updated[existingIndex].limit = parsedLimit;
      setBudgets(updated);
      toast('Budget updated', 'success');
    } else {
      setBudgets([
        ...budgets,
        { category: newCategory, limit: parsedLimit, spent: 0, currency: '€' },
      ]);
      toast('Budget added', 'success');
    }
    setIsAdding(false);
    setNewLimit('');
  };

  const handleDeleteBudget = (category: string) => {
    const deleted = budgets.find((b) => b.category === category);
    setBudgets(budgets.filter((b) => b.category !== category));
    setDeleteTarget(null);
    haptics.warning();
    toast('Budget removed', 'info', 5000, deleted
      ? {
          label: 'Undo',
          onClick: () => {
            setBudgets([...budgets, deleted]);
            haptics.success();
          },
        }
      : undefined);
  };

  // ── Totals ───────────────────────────────────────────────────────────
  const totalLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + getSpentForCategory(b.category), 0);
  const totalNormalizedSpent = budgets.reduce(
    (acc, b) => acc + getNormalizedSpentForCategory(b.category),
    0,
  );
  const totalActualSpent = budgets.reduce((acc, b) => acc + getSpentForCategory(b.category, 'actual'), 0);
  const totalExtraSpent = Math.max(0, totalActualSpent - totalNormalizedSpent);
  const progress = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  // ── Alerts: budgets near/at limit ───────────────────────────────────
  const alerts = budgets
    .map((b) => ({
      category: b.category,
      spent: getSpentForCategory(b.category),
      limit: b.limit,
      percent: b.limit > 0 ? Math.round((getSpentForCategory(b.category) / b.limit) * 100) : 0,
    }))
    .filter((b) => b.percent >= 80);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <motion.div {...pageTransition} className="space-y-4 pb-24">

      {/* ── 1. Safe to Spend + Budget health hero ── */}
      <Card variant="elevated" as="section" className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-headline text-sm font-bold text-on-surface-variant">
                Safe to Spend
              </h2>
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                {formatMonthLabel(selectedMonth)}
              </span>
              <LensSelector value={lens} onChange={setLens} className="mt-1 max-w-[9.25rem] sm:mt-0" />
            </div>
            <p
              className={cn(
                'font-headline text-4xl font-extrabold leading-none tabular-nums',
                safeToSpend.usedPercent > 90 ? 'text-tertiary' : 'text-secondary',
              )}
            >
              {formatCurrency(safeToSpend.remaining)}
            </p>
            <p className="text-xs font-semibold text-on-surface-variant">
              of {formatCurrency(safeToSpend.effectiveLimit)} safe limit
            </p>
          </div>
          <div className="shrink-0 origin-top-right scale-90">
            <RadialGauge
              percent={safeToSpend.usedPercent}
              value={`${safeToSpend.usedPercent}%`}
              label="used"
            />
          </div>
        </div>

        {/* Overall progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
            <span>Budget progress · {formatMonthLabel(selectedMonth)}</span>
            <span>{progress}% of budgeted</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-1000',
                progress >= 100
                  ? 'bg-tertiary'
                  : progress >= 90
                  ? 'bg-accent-amber'
                  : progress >= 70
                  ? 'bg-accent-cyan'
                  : 'bg-secondary',
              )}
              style={{ width: barsMounted ? `${Math.min(100, progress)}%` : '0%' }}
            />
          </div>
          {lens === 'actual' && totalExtraSpent > 0 && (
            <p className="text-[10px] font-bold text-accent-amber">
              {formatCurrency(totalNormalizedSpent)} net of extras · +{formatCurrency(totalExtraSpent)} extras
            </p>
          )}
        </div>

        {/* Add budget shortcut */}
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/25 bg-primary/5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
          aria-label="Add budget"
        >
          <Plus className="h-4 w-4" />
          Add category budget
        </button>
      </Card>

      {/* ── 2. Budget progress list ── */}
      {budgets.length > 0 ? (
        <Card className="space-y-0 p-3">
          <div className="space-y-0 divide-y divide-outline-variant/20">
            {budgets.map((budget) => {
              const spent = getSpentForCategory(budget.category);
              const normalizedSpent = getNormalizedSpentForCategory(budget.category);
              const actualSpent = getSpentForCategory(budget.category, 'actual');
              const extraSpent = Math.max(0, actualSpent - normalizedSpent);
              const budgetProgress = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
              const theme = getCategoryTheme(budget.category);

              return (
                <div key={budget.category} className="budget-row">
                  {/* Row header: icon + name + amounts */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CategoryBadge category={budget.category} size="sm" />
                      <p className="truncate text-sm font-bold text-on-surface">{budget.category}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] font-semibold text-on-surface-variant tabular-nums">
                        {formatCurrency(spent)} of {formatCurrency(budget.limit)}
                      </span>
                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategory(budget.category);
                          setNewLimit(budget.limit.toString());
                          setIsAdding(true);
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        aria-label={`Edit ${budget.category} budget`}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar + percentage */}
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest"
                      role="progressbar"
                      aria-valuenow={Math.min(100, budgetProgress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${budget.category}: ${budgetProgress}%`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: barsMounted ? `${Math.min(100, budgetProgress)}%` : '0%',
                          background:
                            budgetProgress >= 100
                              ? 'var(--color-tertiary)'
                              : budgetProgress >= 90
                              ? 'var(--color-accent-amber)'
                              : theme.color,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        'w-8 shrink-0 text-right text-[10px] font-bold tabular-nums',
                        budgetProgress >= 100
                          ? 'text-tertiary'
                          : budgetProgress >= 90
                          ? 'text-accent-amber'
                          : 'text-on-surface-variant',
                      )}
                    >
                      {budgetProgress}%
                    </span>
                  </div>

                  {/* Extras note */}
                  {lens === 'actual' && extraSpent > 0 && (
                    <p className="text-[10px] font-bold text-accent-amber">
                      {formatCurrency(normalizedSpent)} net · +{formatCurrency(extraSpent)} extras
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<PieChart className="h-10 w-10" />}
            title="No budgets yet"
            description="Create category limits to track progress through the month."
            action={<Button size="md" onClick={() => setIsAdding(true)}>Add budget</Button>}
          />
        </Card>
      )}

      {/* ── 3. Budget alerts ── */}
      {alerts.length > 0 && (
        <section className="space-y-2" aria-label="Budget alerts">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="h-4 w-4 text-accent-amber" />
            <h3 className="text-sm font-bold text-on-surface">Alerts</h3>
          </div>
          {alerts.map((alert) => (
            <div
              key={alert.category}
              className={cn(
                'flex items-center gap-2.5 rounded-2xl p-3',
                alert.percent >= 100
                  ? 'border border-tertiary/20 bg-tertiary/5'
                  : 'border border-accent-amber/20 bg-accent-amber/5',
              )}
            >
              <CategoryBadge category={alert.category} size="sm" />
              <p className="min-w-0 flex-1 text-sm font-semibold text-on-surface">
                <span className="font-bold">{alert.category}</span>
                {alert.percent >= 100
                  ? ': over budget.'
                  : `: you're at ${alert.percent}% of your budget.`}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* ── Add / Edit budget dialog ── */}
      {isAdding && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close budget form"
            className="absolute inset-0"
            onClick={() => setIsAdding(false)}
          />
          <motion.div
            ref={budgetDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-form-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="budget-form-title" className="font-headline font-bold text-primary">
                {budgets.some((b) => b.category === newCategory)
                  ? 'Edit Category Budget'
                  : 'Set Category Budget'}
              </h3>
              <button onClick={() => setIsAdding(false)} aria-label="Close budget form">
                <X className="h-5 w-5 text-on-surface-variant" />
              </button>
            </div>
            <div className="space-y-4">
              <CategoryPicker
                categories={categories}
                value={newCategory}
                onChange={setNewCategory}
                onAddCategory={addCategory}
                disabled={budgets.some((b) => b.category === newCategory)}
              />
              <div>
                <label className="mb-2 block text-[10px] font-bold text-on-surface-variant">
                  Monthly Limit (€)
                </label>
                <button
                  type="button"
                  onClick={() => setIsLimitKeypadOpen(true)}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3 text-left transition-all hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <p className="text-[10px] font-bold text-on-surface-variant">Tap to edit</p>
                  <p className="mt-1 font-headline text-2xl font-extrabold leading-none text-primary">
                    €{newLimit || '0.00'}
                  </p>
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                {budgets.some((b) => b.category === newCategory) && (
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => {
                      setDeleteTarget(newCategory);
                      setIsAdding(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
                <Button
                  className={budgets.some((b) => b.category === newCategory) ? 'flex-[2]' : 'w-full'}
                  onClick={handleAddBudget}
                >
                  {budgets.some((b) => b.category === newCategory) ? 'Update' : 'Save Budget'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Budget"
        message={`Remove the budget for "${deleteTarget}"? This won't delete any transactions.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteTarget && handleDeleteBudget(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
      <NumericKeypadModal
        isOpen={isLimitKeypadOpen}
        onClose={() => setIsLimitKeypadOpen(false)}
        onConfirm={setNewLimit}
        initialValue={newLimit || '0.00'}
      />
    </motion.div>
  );
};
