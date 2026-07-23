import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Target, Tags, Moon } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { CategoryManagerDialog } from '../components/CategoryManagerDialog';
import { NotificationPreferences } from '../components/NotificationPreferences';
import { Card, Switch } from '../components/ui';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import {
  addCategoryName,
  archiveCategoryName,
  getCategoryUsageCounts,
  renameCategoryName,
  renameCategoryReferences,
  restoreCategoryName,
} from '../domain/categories';
import { pageTransition } from '../utils/motion';

export function SettingsPage() {
  const { toast } = useToast();
  const {
    transactions,
    setTransactions,
    budgets,
    setBudgets,
    recurring,
    setRecurring,
    categories,
    setCategories,
    archivedCategories,
    setArchivedCategories,
    savingsGoals,
    setSavingsGoals,
    monthlyBudget,
    setMonthlyBudget,
    isDarkMode,
    setIsDarkMode,
  } = useApp();

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');

  const categoryUsageCounts = useMemo(
    () => getCategoryUsageCounts({ transactions, budgets, recurring }),
    [transactions, budgets, recurring],
  );

  const handleAddCategory = (name: string) => {
    const nextCategories = addCategoryName(categories, name);
    if (nextCategories === categories) return;
    setCategories(nextCategories);
    setArchivedCategories(archivedCategories.filter((category) => category !== name));
    toast('Categoria aggiunta', 'success');
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const nextCategories = renameCategoryName(categories, oldName, newName);
    if (nextCategories === categories) return;

    const nextData = renameCategoryReferences({ transactions, budgets, recurring }, oldName, newName);
    setCategories(nextCategories);
    setTransactions(nextData.transactions);
    setBudgets(nextData.budgets);
    setRecurring(nextData.recurring);
    toast('Categoria aggiornata', 'success');
  };

  const handleDeleteCategory = (name: string) => {
    const next = archiveCategoryName(categories, archivedCategories, name);
    setCategories(next.activeCategories);
    setArchivedCategories(next.archivedCategories);
    toast('Categoria archiviata', 'info');
  };

  const handleRestoreCategory = (name: string) => {
    const next = restoreCategoryName(categories, archivedCategories, name);
    setCategories(next.activeCategories);
    setArchivedCategories(next.archivedCategories);
    toast('Categoria ripristinata', 'success');
  };

  const handleAddGoal = () => {
    const trimmedName = goalName.trim();
    const targetAmount = parseFloat(goalTarget);
    const currentAmount = goalCurrent ? parseFloat(goalCurrent) : 0;
    if (!trimmedName) {
      toast('Inserisci un nome per l’obiettivo', 'warning');
      return;
    }
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast('Inserisci un target valido', 'warning');
      return;
    }
    if (isNaN(currentAmount) || currentAmount < 0) {
      toast('Inserisci un importo attuale valido', 'warning');
      return;
    }

    setSavingsGoals([
      ...savingsGoals,
      {
        id: Math.random().toString(36).slice(2, 11),
        name: trimmedName,
        targetAmount,
        currentAmount: Math.min(currentAmount, targetAmount),
        createdAt: new Date().toISOString(),
      },
    ]);
    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('');
    toast('Obiettivo aggiunto', 'success');
  };

  const handleDeleteGoal = (id: string) => {
    setSavingsGoals(savingsGoals.filter((goal) => goal.id !== id));
    toast('Obiettivo rimosso', 'info');
  };

  return (
    <motion.div
      {...pageTransition}
      data-testid="settings-page"
      className="space-y-6 pb-24"
    >
      <section className="space-y-1 px-1">
        <p className="text-micro font-bold uppercase text-on-surface-variant">Preferences</p>
        <h2 className="font-headline text-2xl font-extrabold text-primary">Settings</h2>
      </section>

      {/* Monthly budget & Category management */}
      <section id="general" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-bold text-primary">General</h3>
          <Settings className="w-5 h-5 text-on-surface-variant" />
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-on-surface">Monthly Budget</p>
              <p className="text-xs text-on-surface-variant">Used for Safe to Spend calculation</p>
            </div>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  autoFocus
                  className="w-24 bg-surface-container-high border-none rounded-xl p-2 text-sm text-right font-bold focus:ring-2 focus:ring-primary"
                  placeholder={monthlyBudget.toString()}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseFloat(budgetInput);
                      if (!isNaN(val) && val > 0) {
                        setMonthlyBudget(val);
                        toast('Monthly budget updated', 'success');
                      }
                      setEditingBudget(false);
                      setBudgetInput('');
                    }
                    if (e.key === 'Escape') {
                      setEditingBudget(false);
                      setBudgetInput('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const val = parseFloat(budgetInput);
                    if (!isNaN(val) && val > 0) {
                      setMonthlyBudget(val);
                      toast('Monthly budget updated', 'success');
                    }
                    setEditingBudget(false);
                    setBudgetInput('');
                  }}
                  className="px-3 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingBudget(true);
                  setBudgetInput(monthlyBudget.toString());
                }}
                className="text-primary font-headline font-bold text-lg hover:bg-primary/5 px-3 py-1 rounded-xl transition-colors"
              >
                {formatCurrency(monthlyBudget)}
              </button>
            )}
          </div>

          <div className="border-t border-outline-variant/15 pt-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-on-surface">Categories</p>
              <p className="text-xs text-on-surface-variant">Manage custom expense & income categories</p>
            </div>
            <button
              onClick={() => setShowCategoryDialog(true)}
              className="flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all"
            >
              <Tags className="w-4 h-4 text-primary" />
              Manage ({categories.length})
            </button>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section id="appearance">
        <Card className="flex items-center justify-between gap-4" aria-labelledby="appearance-title">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Moon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 id="appearance-title" className="text-sm font-bold text-on-surface">Dark mode</h3>
              <p className="text-xs text-on-surface-variant">Use a darker interface theme</p>
            </div>
          </div>
          <Switch checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} label="Toggle dark mode" />
        </Card>
      </section>

      {/* Notifications */}
      <section id="notifications">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-headline font-bold text-primary">Notifications</h3>
        </div>
        <NotificationPreferences />
      </section>

      {/* Savings Goals */}
      <section id="goals">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-headline font-bold text-primary">Obiettivi di risparmio</h3>
          <Target className="w-5 h-5 text-on-surface-variant" />
        </div>
        <div className="space-y-3">
          {savingsGoals.map((goal) => {
            const progress =
              goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0;
            return (
              <div key={goal.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{goal.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatCurrency(goal.currentAmount)} di {formatCurrency(goal.targetAmount)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="h-10 w-10 shrink-0 rounded-xl text-tertiary hover:bg-tertiary/10 flex items-center justify-center"
                    aria-label={`Rimuovi obiettivo ${goal.name}`}
                  >
                    <Target className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-micro font-bold text-secondary">{progress}% completato</p>
              </div>
            );
          })}

          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/5 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="min-h-11 rounded-xl border-none bg-surface-container-lowest px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                placeholder="Nome"
              />
              <input
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                type="number"
                className="min-h-11 rounded-xl border-none bg-surface-container-lowest px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                placeholder="Target"
              />
              <input
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                type="number"
                className="min-h-11 rounded-xl border-none bg-surface-container-lowest px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary"
                placeholder="Attuale"
              />
            </div>
            <button
              onClick={handleAddGoal}
              className="w-full min-h-11 rounded-xl bg-primary text-on-primary text-sm font-headline font-extrabold active:scale-[0.98] transition-all"
            >
              Aggiungi obiettivo
            </button>
          </div>
        </div>
      </section>

      <CategoryManagerDialog
        isOpen={showCategoryDialog}
        categories={categories}
        archivedCategories={archivedCategories}
        usageCounts={categoryUsageCounts}
        onAdd={handleAddCategory}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
        onRestore={handleRestoreCategory}
        onClose={() => setShowCategoryDialog(false)}
      />
    </motion.div>
  );
}
