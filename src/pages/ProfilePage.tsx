import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Plane, Download, Upload, Landmark, ShieldCheck, CreditCard, Wallet, ChevronRight } from 'lucide-react';
import Papa from 'papaparse';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { formatCurrency } from '../utils/formatters';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from '../constants';
import { Account, Transaction, Budget } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export const ProfilePage = () => {
  const { toast } = useToast();
  const [accounts] = useLocalStorage<Account[]>('aura_accounts', INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('aura_transactions', INITIAL_TRANSACTIONS);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>('aura_budgets', INITIAL_BUDGETS);
  const transactionInputRef = useRef<HTMLInputElement>(null);
  const budgetInputRef = useRef<HTMLInputElement>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const initialBalance = INITIAL_ACCOUNTS.reduce((acc, curr) => acc + curr.balance, 0);
  const netWorth = initialBalance + totalIncome - totalExpenses;

  const handleReset = () => {
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

        <div className="grid grid-cols-1 gap-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container p-5 text-on-primary shadow-xl">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase border border-white/10">Major Milestone</span>
                  <Plane className="w-5 h-5 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold mb-1">European Vacation</h3>
                <p className="text-xs font-medium opacity-80 mb-8">Target: €12,000.00</p>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold mb-2 uppercase tracking-wider">
                  <span>€8,400.00 saved</span>
                  <span>70%</span>
                </div>
                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-[70%] rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                </div>
              </div>
            </div>
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
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

      <section className="pt-4">
        <button 
          onClick={() => setShowResetDialog(true)}
          className="w-full py-4 text-tertiary font-bold text-xs uppercase tracking-widest border border-tertiary/20 rounded-2xl hover:bg-tertiary/5 transition-colors"
        >
          Reset All Data
        </button>
      </section>

      <ConfirmDialog
        isOpen={showResetDialog}
        title="Reset All Data"
        message="Are you sure you want to reset all data? This will permanently delete all transactions, budgets, and settings. This cannot be undone."
        confirmLabel="Reset Everything"
        variant="danger"
        onConfirm={handleReset}
        onCancel={() => setShowResetDialog(false)}
      />
    </motion.div>
  );
};
