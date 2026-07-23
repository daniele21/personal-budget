import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ShieldCheck, LogOut, Shield, PieChart, RefreshCw, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AccountList } from '../components/profile/AccountList';
import { pageTransition } from '../utils/motion';

export const ProfilePage = () => {
  const {
    accounts,
    allTimeTotals,
    currentBalance,
    signOut,
    isAdmin,
  } = useApp();

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

  return (
    <motion.div 
      {...pageTransition}
      data-testid="profile-page"
      className="space-y-5 pb-24"
    >
      <CardNetWorth netWorth={netWorth} totalIncome={totalIncome} totalExpenses={totalExpenses} />

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

      <AccountList accounts={accounts} />

      <section className="space-y-4 pt-4">
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
      </section>
    </motion.div>
  );
};

function CardNetWorth({ netWorth, totalIncome, totalExpenses }: { netWorth: number; totalIncome: number; totalExpenses: number }) {
  return (
    <div
      className={cn(
        'rounded-3xl p-5 shadow-sm transition-all',
        netWorth >= 0 ? 'bg-primary text-on-primary' : 'bg-error text-on-error',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-micro font-bold uppercase tracking-[0.12em] opacity-80">Total Net Worth</p>
          <h2 className="truncate text-4xl font-extrabold tracking-tight">{formatCurrency(netWorth)}</h2>
          <p className="mt-1 text-micro font-semibold opacity-80">Opening balances + recorded ledger activity</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-inset ring-white/10">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Calculated</span>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/12 border-t border-white/12 pt-3 mt-4">
        <div className="pr-3">
          <p className="text-micro font-semibold opacity-80">Total income</p>
          <p className="mt-1 truncate text-sm font-bold">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="pl-3">
          <p className="text-micro font-semibold opacity-80">Total expenses</p>
          <p className="mt-1 truncate text-sm font-bold">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>
    </div>
  );
}
