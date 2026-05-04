import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X, Trash2, PieChart } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { formatMonthLabel } from '../domain/finance';
import { CategoryPicker } from '../components/CategoryPicker';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { Card, Button, Input, EmptyState } from '../components/ui';
import { haptics } from '../utils/haptics';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { pageTransition } from '../utils/motion';

export const BudgetsPage = () => {
  const { toast } = useToast();
  const { budgets, setBudgets, categories, addCategory, monthlyTransactions, selectedMonth } = useApp();
  
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

  const getSpentForCategory = (category: string) => {
    return monthlyTransactions
      .filter(t => t.category === category && t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const handleAddBudget = () => {
    const parsedLimit = parseFloat(newLimit);
    if (!newLimit || isNaN(parsedLimit) || parsedLimit <= 0) {
      toast('Please enter a valid limit greater than 0', 'warning');
      return;
    }
    
    const existingIndex = budgets.findIndex(b => b.category === newCategory);
    if (existingIndex > -1) {
      const updated = [...budgets];
      updated[existingIndex].limit = parseFloat(newLimit);
      setBudgets(updated);
      toast('Budget updated', 'success');
    } else {
      setBudgets([...budgets, { category: newCategory, limit: parseFloat(newLimit), spent: 0, currency: '€' }]);
      toast('Budget added', 'success');
    }
    setIsAdding(false);
    setNewLimit('');
  };

  const handleDeleteBudget = (category: string) => {
    const deleted = budgets.find(b => b.category === category);
    setBudgets(budgets.filter(b => b.category !== category));
    setDeleteTarget(null);
    haptics.warning();
    toast('Budget removed', 'info', 5000, deleted ? {
      label: 'Undo',
      onClick: () => {
        setBudgets([...budgets, deleted]);
        haptics.success();
      },
    } : undefined);
  };

  const totalLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + getSpentForCategory(b.category), 0);
  const progress = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <motion.div 
      {...pageTransition}
      className="space-y-4 pb-24"
    >
      <section className="relative overflow-hidden rounded-3xl bg-primary p-5 text-on-primary shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container opacity-20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs opacity-80 font-bold">{formatMonthLabel(selectedMonth)} Expenditure</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              aria-label="Add budget"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-4xl font-extrabold tracking-tight">{formatCurrency(totalSpent)}</h2>
            <span className="text-xs opacity-80 font-medium">of {formatCurrency(totalLimit)} limit</span>
          </div>
          <div className="mt-8 space-y-3">
            <div className="flex justify-between text-micro font-bold">
              <span>Overall Progress</span>
              <span>{progress}% Used</span>
            </div>
            <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)] transition-all duration-1000" 
                style={{ width: barsMounted ? `${Math.min(100, progress)}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {isAdding && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button type="button" aria-label="Close budget form" className="absolute inset-0" onClick={() => setIsAdding(false)} />
          <motion.div
            ref={budgetDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-form-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md rounded-t-3xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant/10 sm:rounded-3xl"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 id="budget-form-title" className="font-headline font-bold text-primary">
                {budgets.some(b => b.category === newCategory) ? 'Edit Category Budget' : 'Set Category Budget'}
              </h3>
              <button onClick={() => setIsAdding(false)} aria-label="Close budget form"><X className="w-5 h-5 text-on-surface-variant" /></button>
            </div>
            <div className="space-y-4">
              <CategoryPicker
                categories={categories}
                value={newCategory}
                onChange={setNewCategory}
                onAddCategory={addCategory}
                disabled={budgets.some(b => b.category === newCategory)}
              />
              <div>
                <label className="block text-micro font-bold text-on-surface-variant mb-2">
                  Monthly Limit (€)
                </label>
                <button
                  type="button"
                  onClick={() => setIsLimitKeypadOpen(true)}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3 text-left transition-all hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <p className="text-micro font-bold text-on-surface-variant">Tap to edit</p>
                  <p className="mt-1 text-2xl font-headline font-extrabold text-primary leading-none">
                    €{newLimit || '0.00'}
                  </p>
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                {budgets.some(b => b.category === newCategory) && (
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => {
                      setDeleteTarget(newCategory);
                      setIsAdding(false);
                    }}
                  >
                    Delete
                  </Button>
                )}
                <Button className={budgets.some(b => b.category === newCategory) ? "flex-[2]" : "w-full"} onClick={handleAddBudget}>
                  {budgets.some(b => b.category === newCategory) ? 'Update' : 'Save Budget'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="space-y-4">
        {budgets.length > 0 ? budgets.map(budget => {
          const spent = getSpentForCategory(budget.category);
          const budgetProgress = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
          
          return (
            <button
              key={budget.category}
              onClick={() => {
                setNewCategory(budget.category);
                setNewLimit(budget.limit.toString());
                setIsAdding(true);
              }}
              className="w-full text-left"
            >
              <Card className="active:scale-[0.98] transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <CategoryBadge category={budget.category} size="md" />
                    <div>
                      <h4 className="font-headline font-bold text-on-surface">{budget.category}</h4>
                      <p className="text-xs text-on-surface-variant font-bold">
                        {spent > budget.limit
                          ? <span className="text-tertiary">Over by {formatCurrency(spent - budget.limit)}</span>
                          : <>{formatCurrency(Math.max(0, budget.limit - spent))} left</>
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-on-surface">{formatCurrency(spent)}</p>
                      <p className="text-xs text-on-surface-variant font-medium">of {formatCurrency(budget.limit)}</p>
                    </div>
                  </div>
                </div>
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      budgetProgress > 100 ? "bg-tertiary" : budgetProgress > 90 ? "bg-accent-amber" : "bg-primary"
                    )}
                    style={{ width: barsMounted ? `${Math.min(100, budgetProgress)}%` : '0%' }}
                  ></div>
                </div>
                {budgetProgress > 90 && budgetProgress <= 100 && (
                  <p className="text-xs text-accent-amber font-bold mt-2">Approaching limit</p>
                )}
                {budgetProgress > 100 && (
                  <p className="text-xs text-tertiary font-bold mt-2">🚨 Budget exceeded!</p>
                )}
              </Card>
            </button>
          );
        }) : (
          <Card>
            <EmptyState
              icon={<PieChart className="w-10 h-10" />}
              title="No budgets yet"
              description="Create category limits to track progress through the month."
              action={<Button size="md" onClick={() => setIsAdding(true)}>Add budget</Button>}
            />
          </Card>
        )}
      </div>

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
