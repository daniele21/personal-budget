import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TrendingUp, Search, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from '../components/CategoryIcon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';

export const HistoryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { transactions, deleteTransaction: ctxDeleteTransaction } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteTransaction = (id: string) => {
    ctxDeleteTransaction(id);
    setDeleteId(null);
    toast('Transaction deleted', 'info');
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = (t.title?.toLowerCase().includes(search.toLowerCase()) || 
                          t.description?.toLowerCase().includes(search.toLowerCase()) || 
                          t.category.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'All' || t.category === filter;
    return matchesSearch && matchesFilter;
  });

  const categories = ['All', ...Array.from(new Set(transactions.map(t => t.category)))];

  // Prepare chart data
  const chartData = transactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc: any[], t) => {
      const date = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const newBalance = t.type === 'income' ? lastBalance + t.amount : lastBalance - t.amount;
      
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.balance = newBalance;
      } else {
        acc.push({ date, balance: newBalance });
      }
      return acc;
    }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4 pb-24"
    >
      <section className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Financial Trajectory</h3>
          <TrendingUp className="w-4 h-4 text-secondary" />
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant)" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }} 
                minTickGap={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface-container-high)', 
                  border: 'none', 
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: 'var(--color-primary)' }}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="var(--color-primary)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-on-surface-variant/50" />
          </div>
          <input 
            className="w-full bg-surface-container-highest border-none rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50 transition-all text-sm" 
            placeholder="Search transactions..." 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar -mx-4 px-4">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setFilter(cat)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap shadow-sm border transition-all",
                filter === cat ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/5"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-headline font-extrabold text-lg">Transaction History</h3>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{filteredTransactions.length} entries</span>
          </div>
          <div className="space-y-2">
            {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl transition-colors border border-outline-variant/5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                    <CategoryIcon category={t.category} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-on-surface truncate">{t.title}</h4>
                    <p className="text-xs font-medium text-on-surface-variant line-clamp-1">{t.description}</p>
                    <p className="text-xs font-medium text-on-surface-variant/60 mt-0.5">{new Date(t.date).toLocaleDateString()} • {t.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <div className="flex flex-col items-end">
                    <p className={cn("text-sm font-extrabold", t.type === 'income' ? "text-secondary" : "text-on-surface")}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    {t.attachmentUrl && <Paperclip className="w-3 h-3 text-primary/40 mt-1" />}
                  </div>
                  <button 
                    onClick={() => navigate(`/edit/${t.id}`)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all"
                    aria-label="Edit transaction"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(t.id)}
                    className="p-2 text-tertiary hover:bg-tertiary/10 rounded-full transition-all"
                    aria-label="Delete transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/20">
                <Search className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
                <p className="text-sm text-on-surface-variant font-medium">No transactions found</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && deleteTransaction(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
};
