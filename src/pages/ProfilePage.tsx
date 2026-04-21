import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Download, Upload, Landmark, ShieldCheck, CreditCard, Wallet, ChevronRight, Settings, LogOut, Shield, PieChart, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { formatCurrency } from '../utils/formatters';
import { INITIAL_ACCOUNTS, APP_CONFIG } from '../constants';
import { Transaction, Budget } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

export const ProfilePage = () => {
  const { toast } = useToast();
  const { accounts, transactions, setTransactions, budgets, setBudgets, monthlyBudget, setMonthlyBudget, allTimeTotals, currentBalance, user, signOut, isAdmin, deleteCloudBackup, pushBackupNow } = useApp();
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const transactionInputRef = useRef<HTMLInputElement>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);
  const [showResetLocalDialog, setShowResetLocalDialog] = useState(false);
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);

  const totalIncome = allTimeTotals.income;
  const totalExpenses = allTimeTotals.expenses;
  const netWorth = currentBalance;

  const handleResetLocal = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleResetAll = async () => {
    await deleteCloudBackup();
    localStorage.clear();
    window.location.reload();
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5 pb-24"
    >
      <section>
        <div className="flex flex-col gap-3 mb-6">
          <div>
            <p className="text-on-surface-variant text-[10px] tracking-[0.2em] uppercase mb-1 font-bold">Total Net Worth</p>
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
          <Link
            to="/budgets"
            className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5 hover:bg-surface-container-low transition-all"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Budgets</p>
              <p className="text-[10px] text-on-surface-variant">Manage limits</p>
            </div>
          </Link>
          <Link
            to="/recurring"
            className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5 hover:bg-surface-container-low transition-all"
          >
            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Recurring</p>
              <p className="text-[10px] text-on-surface-variant">Bills & income</p>
            </div>
          </Link>
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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-headline font-bold text-primary">Data Management</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-on-surface">Export Data</p>
                <p className="text-[10px] text-on-surface-variant font-medium">Download transactions & budgets as CSV</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/40" />
          </button>

          <button
            onClick={async () => {
              toast('Starting backup...', 'info');
              const ok = await pushBackupNow();
              if (ok) toast('Backup pushed to cloud successfully', 'success');
              else toast('Backup failed or skipped (no local data / offline)', 'error');
            }}
            className="mt-3 w-full flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/5 hover:bg-surface-container-high transition-all text-sm font-bold"
          >
            Backup now
          </button>

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

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-headline font-bold text-primary">Your Accounts</h3>
        </div>
        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.id} className="group bg-surface-container-low p-4 rounded-2xl flex items-center justify-between transition-all border border-outline-variant/5">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-surface-container-lowest rounded-full flex items-center justify-center shadow-sm border border-outline-variant/5">
                  {acc.type === 'checking' ? <Landmark className="w-5 h-5 text-primary" /> :
                   acc.type === 'savings' ? <ShieldCheck className="w-5 h-5 text-secondary" /> :
                   acc.type === 'credit' ? <CreditCard className="w-5 h-5 text-primary" /> :
                   <Wallet className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">{acc.name}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium">{acc.bank} • {acc.lastFour}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-primary">{formatCurrency(acc.balance)}</p>
                <p className="text-[8px] text-secondary font-bold uppercase tracking-widest">{acc.status || acc.apy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-4 space-y-4">
        {/* Privacy notice */}
        <div className="bg-secondary-container/10 border border-secondary/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-on-surface mb-1">Your data stays on this device</p>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              All transactions, budgets, and settings are stored locally in your browser. No financial data is sent to any server or third party. You own your data.
            </p>
          </div>
        </div>

        {isAdmin && (
          <Link
            to="/admin"
            className="w-full py-4 flex items-center justify-center gap-2 text-primary font-bold text-xs uppercase tracking-widest border border-primary/20 rounded-2xl hover:bg-primary/5 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Admin Panel
          </Link>
        )}

        <button 
          onClick={signOut}
          className="w-full py-4 flex items-center justify-center gap-2 text-on-surface-variant font-bold text-xs uppercase tracking-widest border border-outline-variant/20 rounded-2xl hover:bg-surface-container-high transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        {/* Danger zone — visually separated */}
        <div className="pt-6 mt-4 border-t border-outline-variant/10">
          <p className="text-[10px] uppercase tracking-widest text-tertiary font-bold mb-3 text-center">Danger Zone</p>
          <div className="space-y-2">
            <button 
              onClick={() => setShowResetLocalDialog(true)}
              className="w-full py-3 text-tertiary/60 font-bold text-[10px] uppercase tracking-widest border border-dashed border-tertiary/20 rounded-2xl hover:bg-tertiary/5 hover:text-tertiary transition-colors"
            >
              Cancella dati locali
            </button>
            <button 
              onClick={() => setShowResetAllDialog(true)}
              className="w-full py-3 text-tertiary/60 font-bold text-[10px] uppercase tracking-widest border border-dashed border-tertiary/20 rounded-2xl hover:bg-tertiary/5 hover:text-tertiary transition-colors"
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
    </motion.div>
  );
};
