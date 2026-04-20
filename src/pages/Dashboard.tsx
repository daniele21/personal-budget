import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { TrendingUp, Lightbulb, ArrowRight } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, APP_CONFIG } from '../constants';
import { Account, Transaction } from '../types';
import { CategoryIcon } from '../components/CategoryIcon';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [accounts] = useLocalStorage<Account[]>('aura_accounts', INITIAL_ACCOUNTS);
  const [transactions] = useLocalStorage<Transaction[]>('aura_transactions', INITIAL_TRANSACTIONS);
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const initialBalance = INITIAL_ACCOUNTS.reduce((acc, curr) => acc + curr.balance, 0);
  const currentBalance = initialBalance + totalIncome - totalExpenses;

  const categories = Array.from(new Set(transactions.map(t => t.category)));
  const spendingByCategory = categories.map(cat => ({
    label: cat,
    amount: transactions
      .filter(t => t.category === cat && t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0)
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  const totalSpent = spendingByCategory.reduce((acc, c) => acc + c.amount, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 pb-24"
    >
      <section className="flex flex-col gap-4">
        <div className="space-y-0.5">
          <p className="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-bold">Total Portfolio Balance</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl sm:text-5xl font-headline font-extrabold tracking-tighter text-primary">
              {formatCurrency(currentBalance)}
            </h2>
            <div className="bg-secondary-container/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-secondary" />
              <span className="text-secondary font-bold text-xs">+8.2%</span>
            </div>
          </div>
        </div>

        <div className="bg-primary text-on-primary p-5 rounded-3xl shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container rounded-full -mr-16 -mt-16 blur-3xl opacity-30"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <Lightbulb className="w-5 h-5 text-secondary-container mb-2 fill-current" />
            <p className="text-base leading-snug font-medium">
              You've saved <span className="text-secondary-container font-bold">{formatCurrency(totalIncome - totalExpenses > 0 ? totalIncome - totalExpenses : 0)}</span> this month. Keep it up!
            </p>
            <button 
              onClick={() => navigate('/history')}
              className="mt-4 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all"
            >
              View Analysis <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-surface-container-lowest p-5 rounded-3xl space-y-4 sm:col-span-2 flex flex-col justify-between shadow-sm border border-outline-variant/5">
          <div>
            <h3 className="text-on-surface-variant text-[10px] uppercase tracking-widest mb-2 font-bold">Safe to Spend</h3>
            <div className="space-y-0.5">
              <p className="text-3xl font-headline font-bold text-secondary">{formatCurrency(Math.max(0, APP_CONFIG.defaultMonthlyBudget - totalExpenses))}</p>
              <p className="text-on-surface-variant text-[10px]">Based on your monthly budget of {formatCurrency(APP_CONFIG.defaultMonthlyBudget)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary rounded-full shadow-[0_0_10px_rgba(74,222,128,0.3)] transition-all duration-1000" 
                style={{ width: `${Math.min(100, (totalExpenses / APP_CONFIG.defaultMonthlyBudget) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-on-surface-variant uppercase">
              <span>Used {Math.round((totalExpenses / APP_CONFIG.defaultMonthlyBudget) * 100)}%</span>
              <span>Goal: 75%</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low p-5 rounded-3xl border-none">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-secondary rotate-180" />
            </div>
          </div>
          <h3 className="text-on-surface-variant text-[10px] uppercase tracking-widest mb-1 font-bold">Total Income</h3>
          <p className="text-2xl font-headline font-bold text-on-surface">{formatCurrency(totalIncome)}</p>
        </div>

        <div className="bg-surface-container-low p-5 rounded-3xl border-none">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-surface-container-lowest rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-tertiary" />
            </div>
          </div>
          <h3 className="text-on-surface-variant text-[10px] uppercase tracking-widest mb-1 font-bold">Total Expenses</h3>
          <p className="text-2xl font-headline font-bold text-on-surface">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-3xl sm:col-span-2 shadow-sm border border-outline-variant/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-on-surface font-headline font-bold text-base">Spending by Category</h3>
          </div>
          <div className="flex flex-col gap-6">
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="var(--color-surface-container-highest)" strokeWidth="12" />
                <circle 
                  cx="50" cy="50" fill="transparent" r="40" stroke="var(--color-primary)" strokeWidth="12" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * Math.min(1, totalSpent / 10000))} 
                  strokeLinecap="round" 
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[8px] text-on-surface-variant uppercase tracking-widest font-bold">Total</span>
                <span className="text-base font-headline font-bold text-on-surface">{formatCurrency(totalSpent)}</span>
              </div>
            </div>
            <div className="space-y-2">
              {spendingByCategory.slice(0, 4).map((cat, i) => (
                <div key={cat.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-primary" : i === 1 ? "bg-secondary" : "bg-tertiary")}></div>
                    <span className="text-[10px] text-on-surface font-medium">{cat.label}</span>
                  </div>
                  <span className="font-headline font-bold text-[10px] text-on-surface">{formatCurrency(cat.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="bg-surface-container-low rounded-3xl p-5">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-base font-headline font-bold text-primary">Recent Transactions</h3>
            <p className="text-on-surface-variant text-[10px]">Tracking your architectural ledger</p>
          </div>
          <Link to="/history" className="bg-surface-container-lowest text-primary px-3 py-1 rounded-full text-[9px] font-bold shadow-sm hover:shadow-md transition-all uppercase tracking-widest">
            View All
          </Link>
        </div>
        <div className="space-y-1.5">
          {transactions.slice(0, 3).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-2.5 bg-surface-container-lowest rounded-2xl hover:bg-white/5 transition-colors border border-outline-variant/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-surface-container-high rounded-full flex items-center justify-center">
                  <CategoryIcon category={t.category} className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-headline font-bold text-on-surface">{t.title}</p>
                  <p className="text-[9px] text-on-surface-variant font-medium">{t.category} • Today</p>
                </div>
              </div>
              <p className={cn("text-xs font-headline font-bold", t.type === 'income' ? "text-secondary" : "text-on-surface")}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};
