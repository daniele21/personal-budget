import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Download, Upload, ShieldCheck, ChevronRight, Settings, LogOut, Shield, PieChart, RefreshCw, Tags, Cloud, Target, Trash2, FileArchive, LockKeyhole } from 'lucide-react';
import Papa from 'papaparse';
import { formatCurrency } from '../utils/formatters';
import { INITIAL_ACCOUNTS, APP_CONFIG } from '../constants';
import type { PreparedRestore } from '../domain/archive';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategoryManagerDialog } from '../components/CategoryManagerDialog';
import { NotificationPreferences } from '../components/NotificationPreferences';
import { Card, Switch } from '../components/ui';
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
import { ExportArchiveDialog } from '../components/archive/ExportArchiveDialog';
import { ImportArchiveDialog } from '../components/archive/ImportArchiveDialog';
import { RestoreArchiveConfirmDialog } from '../components/archive/RestoreArchiveConfirmDialog';
import { downloadBlob } from '../services/archive/archiveDownload';

export const ProfilePage = () => {
  const { toast } = useToast();
  const {
    accounts, transactions, setTransactions, budgets, setBudgets, recurring, setRecurring,
    categories, setCategories, archivedCategories, setArchivedCategories,
    savingsGoals, setSavingsGoals, monthlyBudget, setMonthlyBudget, allTimeTotals, currentBalance,
    user, signOut, isAdmin, cloudBackupEnabled, setCloudBackupEnabled,
    backupStatus, lastBackupDate, deleteCloudBackup, pushBackupNow, resetAll,
  } = useApp();
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showResetLocalDialog, setShowResetLocalDialog] = useState(false);
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showExportArchiveDialog, setShowExportArchiveDialog] = useState(false);
  const [showImportArchiveDialog, setShowImportArchiveDialog] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<{
    prepared: PreparedRestore;
    passphrase?: string;
  } | null>(null);
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
      to: '/planning/recurring',
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
  const portableAppData = useMemo(() => ({
    transactions,
    budgets,
    recurring,
    accounts,
    categories,
    archivedCategories,
    savingsGoals,
    monthlyBudget,
  }), [
    accounts,
    archivedCategories,
    budgets,
    categories,
    monthlyBudget,
    recurring,
    savingsGoals,
    transactions,
  ]);

  const handleResetLocal = () => {
    resetAll();
  };

  const handleResetAll = async () => {
    await deleteCloudBackup();
    resetAll();
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

  const handleExportTransactionsCsv = () => {
    const transactionsCsv = Papa.unparse(transactions.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      title: transaction.title,
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,
      attachmentUrl: transaction.attachmentUrl,
      verified: transaction.verified,
      sourceRecurringId: transaction.sourceRecurringId,
      sourceMonthKey: transaction.sourceMonthKey,
      recurringEdited: transaction.recurringEdited,
      reportingClass: transaction.reportingClass ?? 'regular',
      reportingNote: transaction.reportingNote ?? '',
    })));
    const transactionsBlob = new Blob([transactionsCsv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(
      transactionsBlob,
      `aura_transactions_${new Date().toISOString().split('T')[0]}.csv`,
    );
  };

  return (
    <motion.div 
      {...pageTransition}
      data-testid="profile-page"
      className="space-y-5 pb-24"
    >
      <Card variant="inverse" tone={netWorth >= 0 ? 'positive' : 'danger'} as="section" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-micro font-bold uppercase tracking-[0.12em] text-inverse-on-surface-variant">Total Net Worth</p>
            <h2 className="truncate text-4xl font-extrabold tracking-tight text-inverse-on-surface">{formatCurrency(netWorth)}</h2>
            <p className="mt-1 text-micro font-semibold text-inverse-on-surface-variant">Opening balances + recorded ledger activity</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-inverse-positive ring-1 ring-inset ring-white/10">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Calculated</span>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/12 border-t border-white/12 pt-3">
          <div className="pr-3">
            <p className="text-micro font-semibold text-inverse-on-surface-variant">Total income</p>
            <p className="mt-1 truncate text-sm font-bold text-inverse-positive">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="pl-3">
            <p className="text-micro font-semibold text-inverse-on-surface-variant">Total expenses</p>
            <p className="mt-1 truncate text-sm font-bold text-inverse-danger">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </Card>

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

      <section id="settings" className="scroll-mt-24">
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

      <section id="data-management" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-headline font-bold text-primary">Data Management</h3>
        </div>
        <div className="space-y-5">
          <div id="privacy-backup" className="scroll-mt-24 space-y-3">
            <div className="flex items-start gap-3 border-b border-outline-variant/15 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileArchive className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Complete Aura archive</p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Use one verified file to rebuild your local workspace, including receipts and supported preferences. Processing stays on this device.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExportArchiveDialog(true)}
              className="group flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl bg-primary p-4 text-on-primary shadow-md shadow-primary/15 transition-all hover:bg-primary-container active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="flex min-w-0 items-center gap-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><LockKeyhole className="h-5 w-5" /></span>
                <span>
                  <span className="block text-sm font-headline font-extrabold">Export complete archive</span>
                  <span className="block text-micro font-medium text-on-primary/75">Passphrase protection selected by default</span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-on-primary/70 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowImportArchiveDialog(true)}
              className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 text-on-surface transition-all hover:bg-surface-container-low active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="flex min-w-0 items-center gap-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Upload className="h-4 w-4" /></span>
                <span>
                  <span className="block text-sm font-bold">Import Aura archive</span>
                  <span className="block text-micro text-on-surface-variant">Verify, preview, create safety protection, then replace</span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant/50 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="border-t border-outline-variant/15 pt-5">
            <p className="mb-3 text-xs font-bold text-on-surface">Transaction interoperability</p>
            <p className="mb-3 text-micro leading-relaxed text-on-surface-variant">CSV is for analysis or moving transaction rows. It is not a complete backup and does not include receipts, accounts, recurring rules, goals, or preferences.</p>
          </div>
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
              onClick={handleExportTransactionsCsv}
              className="flex flex-col items-center gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold text-on-surface">Export transactions CSV</p>
            </button>
          </div>

          <div className="border-t border-outline-variant/15 pt-5">
            <p className="mb-3 text-xs font-bold text-on-surface">Optional cloud backup</p>
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

          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/5 p-5 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Importa transazioni</p>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Carica estratti conto Excel o CSV. I file generici vengono inviati a Google Gemini dopo il consenso; gli export CSV Aura restano locali.
              </p>
            </div>
            <Link
              to="/transactions?import=1"
              className="w-full py-3 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
            >
              Import bank statement or CSV
            </Link>
          </div>
        </div>
      </section>

      <AccountList accounts={accounts} />

      <section className="space-y-4 pt-4">
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
              className="w-full min-h-12 px-4 flex items-center justify-center text-tertiary font-headline font-extrabold text-xs border border-dashed border-tertiary/30 rounded-2xl hover:bg-tertiary/5 transition-colors"
            >
              Cancella dati locali
            </button>
            <button 
              onClick={() => setShowResetAllDialog(true)}
              className="w-full min-h-12 px-4 flex items-center justify-center text-tertiary font-headline font-extrabold text-xs border border-dashed border-tertiary/30 rounded-2xl hover:bg-tertiary/5 transition-colors"
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

      <ExportArchiveDialog
        isOpen={showExportArchiveDialog}
        data={portableAppData}
        onClose={() => setShowExportArchiveDialog(false)}
      />

      <ImportArchiveDialog
        isOpen={showImportArchiveDialog}
        onClose={() => setShowImportArchiveDialog(false)}
        onPrepared={({ prepared, passphrase }) => {
          setShowImportArchiveDialog(false);
          setRestoreCandidate({ prepared, passphrase });
        }}
      />

      {restoreCandidate && (
        <RestoreArchiveConfirmDialog
          isOpen
          prepared={restoreCandidate.prepared}
          archivePassphrase={restoreCandidate.passphrase}
          onCancel={() => setRestoreCandidate(null)}
          onComplete={() => window.location.reload()}
        />
      )}
    </motion.div>
  );
};
