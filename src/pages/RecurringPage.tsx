import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils/formatters';
import { INITIAL_RECURRING, INITIAL_CATEGORIES, APP_CONFIG } from '../constants';
import { RecurringExpense } from '../types';
import { CategoryIcon } from '../components/CategoryIcon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export const RecurringPage = () => {
  const { toast } = useToast();
  const [recurring, setRecurring] = useLocalStorage<RecurringExpense[]>('aura_recurring', INITIAL_RECURRING);
  const [categories] = useLocalStorage<string[]>('aura_categories_list', INITIAL_CATEGORIES);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Dynamic month navigation
  const [viewDate, setViewDate] = useState(new Date());
  
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddRecurring = () => {
    if (!newName || !newAmount) return;
    
    const newBill: RecurringExpense = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: newName,
      amount: parseFloat(newAmount),
      dueDate: new Date(newDate).toISOString(),
      category: newCategory,
      frequency: 'monthly',
      priority: true
    };

    if (editingId) {
      setRecurring(recurring.map(r => r.id === editingId ? newBill : r));
    } else {
      setRecurring([...recurring, newBill]);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setNewName('');
    setNewAmount('');
  };

  const handleEdit = (bill: RecurringExpense) => {
    setEditingId(bill.id);
    setNewName(bill.name);
    setNewAmount(bill.amount.toString());
    setNewDate(new Date(bill.dueDate).toISOString().split('T')[0]);
    setNewCategory(bill.category);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setRecurring(recurring.filter(r => r.id !== id));
    setDeleteId(null);
    toast('Recurring bill removed', 'info');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 pb-24"
    >
      <section className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-lg font-bold text-primary">
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsAdding(true)}
              className="p-2 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
              aria-label="Add recurring bill"
            >
              <Plus className="w-4 h-4 text-primary" />
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4 text-primary" />
              </button>
              <button
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
            <span key={`${d}-${idx}`} className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{d}</span>
          ))}
        </div>
        {(() => {
          const year = viewDate.getFullYear();
          const month = viewDate.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDayOfWeek = new Date(year, month, 1).getDay();
          const cells = Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ));
          const dayCells = Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasExpense = recurring.some(r => new Date(r.dueDate).getDate() === day);
            const isSelected = day === selectedDay;
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            return (
              <button 
                key={day} 
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all min-h-[40px]",
                  isSelected ? "bg-primary text-on-primary shadow-lg shadow-primary/20" : "text-on-surface hover:bg-surface-container-low",
                  hasExpense && !isSelected && "border border-secondary/30",
                  isToday && !isSelected && "ring-1 ring-primary/30"
                )}
              >
                <span>{day}</span>
                {hasExpense && <div className={cn("w-1 h-1 rounded-full mt-0.5", isSelected ? "bg-on-primary" : "bg-secondary")}></div>}
              </button>
            );
          });
          return <div className="grid grid-cols-7 gap-1">{cells}{dayCells}</div>;
        })()}
      </section>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-container-lowest p-6 rounded-3xl shadow-lg border border-outline-variant/10 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-headline font-bold text-primary">{editingId ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }}><X className="w-5 h-5 text-on-surface-variant" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Bill Name</label>
              <input 
                className="w-full bg-surface-container-high border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                placeholder="e.g. Netflix"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Amount ({APP_CONFIG.currency})</label>
                <input 
                  type="number"
                  className="w-full bg-surface-container-high border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                  placeholder="12.99"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Due Date</label>
                <input 
                  type="date"
                  className="w-full bg-surface-container-high border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
            </div>
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
            <button 
              onClick={handleAddRecurring}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all"
            >
              {editingId ? 'Update Bill' : 'Add Bill'}
            </button>
          </div>
        </motion.div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-headline font-extrabold text-lg">Upcoming Bills</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{recurring.length} Due</span>
          </div>
        </div>
        <div className="space-y-3">
          {recurring.length > 0 ? recurring.map(item => (
            <div key={item.id} className="bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-3 shadow-sm border border-outline-variant/5">
              <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center flex-shrink-0">
                <CategoryIcon category={item.category} className="text-primary" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-headline font-bold text-sm text-on-surface truncate">{item.name}</h4>
                  <span className="font-headline font-extrabold text-sm text-primary flex-shrink-0 ml-2">{formatCurrency(item.amount)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-on-surface-variant font-medium">Due {new Date(item.dueDate).toLocaleDateString()}</span>
                  {item.priority && <span className="text-xs uppercase tracking-tight bg-surface-container-highest px-2 py-0.5 rounded-full font-bold text-primary">Priority</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleEdit(item)} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-all" aria-label="Edit bill">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(item.id)} className="p-2 text-tertiary hover:bg-tertiary/10 rounded-full transition-all" aria-label="Delete bill">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/20">
              <p className="text-sm text-on-surface-variant font-medium">No recurring bills yet</p>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Remove Recurring Bill"
        message="Are you sure you want to remove this recurring bill?"
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
};
