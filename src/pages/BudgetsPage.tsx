import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { INITIAL_BUDGETS, INITIAL_TRANSACTIONS, INITIAL_CATEGORIES } from '../constants';
import { Budget, Transaction } from '../types';
import { CategoryIcon } from '../components/CategoryIcon';

export const BudgetsPage = () => {
  const [budgets, setBudgets] = useLocalStorage<Budget[]>('aura_budgets', INITIAL_BUDGETS);
  const [transactions] = useLocalStorage<Transaction[]>('aura_transactions', INITIAL_TRANSACTIONS);
  const [categories] = useLocalStorage<string[]>('aura_categories_list', INITIAL_CATEGORIES);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [newLimit, setNewLimit] = useState('');

  const getSpentForCategory = (category: string) => {
    return transactions
      .filter(t => t.category === category && t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const handleAddBudget = () => {
    if (!newLimit || isNaN(parseFloat(newLimit))) return;
    
    const existingIndex = budgets.findIndex(b => b.category === newCategory);
    if (existingIndex > -1) {
      const updated = [...budgets];
      updated[existingIndex].limit = parseFloat(newLimit);
      setBudgets(updated);
    } else {
      setBudgets([...budgets, { category: newCategory, limit: parseFloat(newLimit), spent: 0, currency: '€' }]);
    }
    setIsAdding(false);
    setNewLimit('');
  };

  const totalLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + getSpentForCategory(b.category), 0);
  const progress = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 pb-24"
    >
      <section className="relative overflow-hidden rounded-3xl bg-primary p-5 text-on-primary shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container opacity-20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Monthly Expenditure</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-4xl font-extrabold tracking-tight">{formatCurrency(totalSpent)}</h2>
            <span className="text-xs opacity-80 font-medium">of {formatCurrency(totalLimit)} limit</span>
          </div>
          <div className="mt-8 space-y-3">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
              <span>Overall Progress</span>
              <span>{progress}% Used</span>
            </div>
            <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)] transition-all duration-1000" 
                style={{ width: `${Math.min(100, progress)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-container-lowest p-6 rounded-3xl shadow-lg border border-outline-variant/10 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-headline font-bold text-primary">Set Category Budget</h3>
            <button onClick={() => setIsAdding(false)}><X className="w-5 h-5 text-on-surface-variant" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Category</label>
              <select 
                className="w-full bg-surface-container-high border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Monthly Limit (€)</label>
              <input 
                type="number"
                className="w-full bg-surface-container-high border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                placeholder="e.g. 500"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
              />
            </div>
            <button 
              onClick={handleAddBudget}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all"
            >
              Save Budget
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {budgets.map(budget => {
          const spent = getSpentForCategory(budget.category);
          const budgetProgress = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
          
          return (
            <div key={budget.category} className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                    <CategoryIcon category={budget.category} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-on-surface">{budget.category}</h4>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{formatCurrency(Math.max(0, budget.limit - spent))} left</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-on-surface">{formatCurrency(spent)}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium">of {formatCurrency(budget.limit)}</p>
                </div>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    budgetProgress > 90 ? "bg-tertiary" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(100, budgetProgress)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
