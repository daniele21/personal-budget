import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Download, Upload, ShieldCheck, ChevronRight, Settings, LogOut, Shield, PieChart, RefreshCw, Tags, Cloud, Target, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import { formatCurrency } from '../utils/formatters';
import { INITIAL_ACCOUNTS, APP_CONFIG } from '../constants';
import { Transaction, Budget } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategoryManagerDialog } from '../components/CategoryManagerDialog';
import { NotificationPreferences } from '../components/NotificationPreferences';
import { Switch } from '../components/ui';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AccountList } from '../components/profile/AccountList';
import {
  addCategoryName,
  archiveCategoryName,
  getCategoryUsageCounts,
  renameCategoryName,
  renameCategoryReferences,
  restoreCategoryName,
} from '../domain/categories';
import { pageTransition } from '../utils/motion';

export const ProfilePage = () => {
  const { toast } = useToast();
  const {
    accounts, transactions, setTransactions, budgets, setBudgets, recurring, setRecurring,
    categories, setCategories, archivedCategories, setArchivedCategories,
    savingsGoals, setSavingsGoals, monthlyBudget, setMonthlyBudget, allTimeTotals, currentBalance,
    user, signOut, isAdmin, cloudBackupEnabled, setCloudBackupEnabled,
    backupStatus, lastBackupDate, deleteCloudBackup, pushBackupNow,
  } = useApp();
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const transactionInputRef = useRef<HTMLInputElement>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);
  const [showResetLocalDialog, setShowResetLocalDialog] = useState(false);
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');

  const totalIncome = allTimeTotals.income;
  const totalExpenses = allTimeTotals.expenses;
  const netWorth = currentBalance;
  const quickAccessItems = [
    {
      to: '/budgets',
      label: 'Budgets',
      ariaLabel: 'Open budgets',
      icon: PieChart,
      className: 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
      iconClassName: 'bg-primary/10 text-primary',
    },
    {
      to: '/recurring',
      label: 'Recurring',
      ariaLabel: 'Open recurring bills and income',
      icon: RefreshCw,
      className: 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
      iconClassName: 'bg-secondary/10 text-secondary',
    },
  ];
  const categoryUsageCounts = useMemo(
    () => getCategoryUsageCounts({ transactions, budgets, recurring }),
    [transactions, budgets, recurring],
  );

  const handleResetLocal = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleResetAll = async () => {
    await deleteCloudBackup();
    localStorage.clear();
    window.location.reload();
  };

  const handleBackupNow = async () => {
    if (isBackingUp) return;
    if (!cloudBackupEnabled) {
      toast('Enable cloud backup first', 'warning');
      return;
    }
    setIsBackingUp(true);
    toast('Starting backup...', 'info');
    const ok = await pushBackupNow();
    setIsBackingUp(false);
    if (ok) toast('Backup pushed to cloud successfully', 'success');
    else toast('Backup failed or skipped (no local data / offline)', 'error');
  };

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

  const handleExport = () => {
    // Export Transactions
    const transactionsCsv = Papa.unparse(transactions);
    const transactionsBlob = new Blob([transactionsCsv], { type: 'text/csv;charset=utf-8;' });
    const transactionsUrl = URL.createObjectURL(transactionsBlob);
    const transactionsLink = document.createElement('a');
    transactionsLink.setAttribute('href', transactionsUrl);
    transactionsLink.setAttribute('download', `aura_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    transactionsLink.click();

    // Export Budgets
    setTimeout(() => {
      const budgetsCsv = Papa.unparse(budgets);
      const budgetsBlob = new Blob([budgetsCsv], { type: 'text/csv;charset=utf-8;' });
      const budgetsUrl = URL.createObjectURL(budgetsBlob);
      const budgetsLink = document.createElement('a');
      budgetsLink.setAttribute('href', budgetsUrl);
      budgetsLink.setAttribute('download', `aura_budgets_${new Date().toISOString().split('T')[0]}.csv`);
      budgetsLink.click();
    }, 500);
  };

  const handleImportTransactions = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const imported = results.data as any[];
          if (imported.length > 0 && imported[0].amount !== undefined) {
            // Merge with existing, avoiding exact duplicates if possible (simple check)
            const newTransactions = [...transactions];
            imported.forEach(item => {
              if (!newTransactions.find(t => t.id === item.id)) {
                newTransactions.push(item);
              }
            });
            setTransactions(newTransactions);
            toast(`Imported ${imported.length} transactions!`, 'success');
          } else {
            toast('Invalid transaction CSV format.', 'error');
          }
        }
      });
    }
  };

  const handleImportBudgets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const imported = results.data as any[];
          if (imported.length > 0 && imported[0].limit !== undefined) {
            setBudgets(imported as Budget[]);
            toast(`Imported ${imported.length} budgets!`, 'success');
          } else {
            toast('Invalid budget CSV format.', 'error');
          }
        }
      });
    }
  };

  return (
    <motion.div 
      {...pageTransition}
      className="space-y-5 pb-24"
    >
      <section>
        <div className="flex flex-col gap-3 mb-6">
          <div>
            <p className="text-on-surface-variant text-micro mb-1 font-bold">Total Net Worth</p>
            <h2 className="text-4xl font-extrabold text-primary tracking-tight">{formatCurrency(netWorth)}</h2>
          </div>
          <div className="flex items-center gap-2 text-secondary font-bold bg-secondary-container/20 px-4 py-1.5 rounded-full w-fit text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Real-time calculation</span>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-headline font-bold text-primary">Quick Access</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.ariaLabel}
                className={cn(
                  'flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant/5 px-2 py-3 text-center transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                  item.className,
                )}
              >
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', item.iconClassName)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-headline font-bold text-primary">Settings</h3>
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
                onClick={() => { setEditingBudget(true); setBudgetInput(monthlyBudget.toString()); }}
                className="text-primary font-headline font-bold text-lg hover:bg-primary/5 px-3 py-1 rounded-xl transition-colors"
              >
                {formatCurrency(monthlyBudget)}
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-headline font-bold text-primary">Notifications</h3>
        </div>
        <NotificationPreferences />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-headline font-bold text-primary">Obiettivi di risparmio</h3>
          <Target className="w-5 h-5 text-on-surface-variant" />
        </div>
        <div className="space-y-3">
          {savingsGoals.map((goal) => {
            const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
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
                    <Trash2 className="w-4 h-4" />
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

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-headline font-bold text-primary">Data Management</h3>
        </div>
        <div className="space-y-3">
          {/* Compact action grid — 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowCategoryDialog(true)}
              className="flex flex-col items-center gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Tags className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold text-on-surface">Categories</p>
            </button>

            <button
              onClick={handleExport}
              className="flex flex-col items-center gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold text-on-surface">Export CSV</p>
            </button>
          </div>

          <button
            onClick={handleBackupNow}
            disabled={isBackingUp || !cloudBackupEnabled}
            className="group w-full min-h-16 flex items-center justify-between gap-3 p-4 bg-primary text-on-primary rounded-2xl shadow-md shadow-primary/15 hover:bg-primary-container active:scale-[0.99] transition-all disabled:pointer-events-none disabled:opacity-70"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                <RefreshCw className={cn('w-5 h-5', isBackingUp && 'animate-spin')} />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-headline font-extrabold leading-tight">
                  {isBackingUp ? 'Backing up...' : 'Backup now'}
                </p>
                <p className="text-micro text-on-primary/75 font-medium leading-tight">
                  {cloudBackupEnabled ? 'Encrypted cloud backup' : 'Enable cloud backup first'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-on-primary/70 transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface">Cloud backup</p>
                  <p className="text-micro text-on-surface-variant font-medium">
                    {cloudBackupEnabled ? 'Attivo' : 'Off'}
                    {lastBackupDate ? ` · ${lastBackupDate}` : ''}
                  </p>
                </div>
              </div>
              <Switch
                checked={cloudBackupEnabled}
                onChange={() => setCloudBackupEnabled(!cloudBackupEnabled)}
                label={cloudBackupEnabled ? 'Disattiva backup cloud' : 'Attiva backup cloud'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => transactionInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high transition-all"
            >
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-secondary" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-on-surface">Import Transactions</p>
              </div>
              <input 
                type="file" 
                ref={transactionInputRef} 
                className="hidden" 
                accept=".csv" 
                onChange={handleImportTransactions} 
              />
            </button>

            <button 
              onClick={() => budgetInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high transition-all"
            >
              <div className="w-10 h-10 bg-tertiary/10 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-tertiary" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-on-surface">Import Budgets</p>
              </div>
              <input 
                type="file" 
                ref={budgetInputRef} 
                className="hidden" 
                accept=".csv" 
                onChange={handleImportBudgets} 
              />
            </button>
          </div>
        </div>
      </section>

      <AccountList accounts={accounts} />

      <section className="pt-4 space-y-4">
        {/* Privacy notice */}
        <div className="bg-secondary-container/10 border border-secondary/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-on-surface mb-1">Your data stays on this device</p>
            <p className="text-micro text-on-surface-variant leading-relaxed">
              Transactions, budgets and settings are stored locally in your browser. If you enable cloud backup, an encrypted copy is stored in Firestore for restore across devices.
            </p>
          </div>
        </div>

        {isAdmin && (
          <Link
            to="/admin"
            className="group w-full min-h-14 px-4 flex items-center justify-between gap-3 text-primary font-bold border border-primary/20 rounded-2xl hover:bg-primary/5 transition-all"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </span>
              <span className="text-sm font-headline font-extrabold">Admin Panel</span>
            </span>
            <ChevronRight className="w-4 h-4 text-primary/50 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        <button 
          onClick={signOut}
          className="group w-full min-h-14 px-4 flex items-center justify-between gap-3 text-on-surface-variant font-bold border border-outline-variant/20 rounded-2xl hover:bg-surface-container-high transition-all"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 bg-surface-container-low rounded-xl flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </span>
            <span className="text-sm font-headline font-extrabold">Sign Out</span>
          </span>
          <ChevronRight className="w-4 h-4 text-on-surface-variant/40 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* Danger zone — visually separated */}
        <div className="pt-6 mt-4 border-t border-outline-variant/10">
          <p className="text-micro text-tertiary font-bold mb-3 text-center">Danger Zone</p>
          <div className="space-y-2">
            <button 
              onClick={() => setShowResetLocalDialog(true)}
              className="w-full min-h-12 px-4 flex items-center justify-center text-tertiary/70 font-headline font-extrabold text-xs border border-dashed border-tertiary/20 rounded-2xl hover:bg-tertiary/5 hover:text-tertiary transition-colors"
            >
              Cancella dati locali
            </button>
            <button 
              onClick={() => setShowResetAllDialog(true)}
              className="w-full min-h-12 px-4 flex items-center justify-center text-tertiary/70 font-headline font-extrabold text-xs border border-dashed border-tertiary/20 rounded-2xl hover:bg-tertiary/5 hover:text-tertiary transition-colors"
            >
              Cancella tutto (locale + backup cloud)
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={showResetLocalDialog}
        title="Cancella dati locali"
        message="Verranno cancellati tutti i dati dal dispositivo (transazioni, budget, ricorrenti, impostazioni). Il backup nel cloud resterà disponibile e ti verrà proposto al prossimo accesso."
        confirmLabel="Cancella dati locali"
        variant="danger"
        onConfirm={handleResetLocal}
        onCancel={() => setShowResetLocalDialog(false)}
      />

      <ConfirmDialog
        isOpen={showResetAllDialog}
        title="⚠️ Cancellazione totale"
        message="Verranno cancellati TUTTI i dati: dal dispositivo e dal backup nel cloud. Questa azione è irreversibile. Sei assolutamente sicuro?"
        confirmLabel="Sì, cancella tutto"
        variant="danger"
        onConfirm={handleResetAll}
        onCancel={() => setShowResetAllDialog(false)}
      />

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
};
