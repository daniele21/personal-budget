import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Pencil, Check, X, Camera, Plus } from 'lucide-react';
import { get, set, del } from 'idb-keyval';
import { cn } from '../lib/utils';
import { APP_CONFIG } from '../constants';
import { Transaction } from '../types';
import { CategoryIcon } from '../components/CategoryIcon';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';

export const AddTransaction = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { transactions, setTransactions, categories, setCategories } = useApp();
  const [amount, setAmount] = useState('0.00');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState(categories[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        setAmount(transaction.amount.toString());
        setType(transaction.type);
        setCategory(transaction.category);
        setTitle(transaction.title);
        setDescription(transaction.description);
        setDate(new Date(transaction.date).toISOString().split('T')[0]);
        setPaymentMethod(transaction.paymentMethod);
        
        // Load attachment from IndexedDB
        get(`attachment_${id}`).then(val => {
          if (val) setAttachmentUrl(val);
        });
      }
    }
  }, [id, transactions]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast('Please enter a title', 'warning');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast('Please enter a valid amount greater than 0', 'warning');
      return;
    }

    if (!date) {
      toast('Please select a date', 'warning');
      return;
    }
    
    const transactionId = id || Math.random().toString(36).substr(2, 9);
    
    const newTransaction: Transaction = {
      id: transactionId,
      amount: parsedAmount,
      type,
      category,
      date: new Date(date).toISOString(),
      title: trimmedTitle,
      description: description.trim(),
      paymentMethod,
      // We store the flag in LocalStorage, but the actual data in IndexedDB
      attachmentUrl: attachmentUrl ? 'indexeddb' : undefined 
    };

    if (attachmentUrl && attachmentUrl !== 'indexeddb') {
      await set(`attachment_${transactionId}`, attachmentUrl);
    } else if (!attachmentUrl) {
      await del(`attachment_${transactionId}`);
    }

    if (id) {
      setTransactions(transactions.map(t => t.id === id ? newTransaction : t));
    } else {
      setTransactions([newTransaction, ...transactions]);
    }
    
    toast(id ? 'Transaction updated!' : 'Transaction saved!', 'success');
    navigate('/history');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit file size to 2MB for IndexedDB safety (though it can handle more)
      if (file.size > 2 * 1024 * 1024) {
        toast('File is too large. Please select an image under 2MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const addNewCategory = () => {
    if (newCategoryName && !categories.includes(newCategoryName)) {
      setCategories([...categories, newCategoryName]);
      setCategory(newCategoryName);
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-md mx-auto pb-24"
    >
      <div className="flex p-1 bg-surface-container-high rounded-full mb-6 w-full max-w-[280px] mx-auto">
        <button 
          onClick={() => setType('expense')}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-full font-headline font-bold text-xs transition-all",
            type === 'expense' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-variant/50"
          )}
        >
          Expense
        </button>
        <button 
          onClick={() => setType('income')}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-full font-headline font-bold text-xs transition-all",
            type === 'income' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-variant/50"
          )}
        >
          Income
        </button>
      </div>

      <section className="mb-10 text-center">
        <label className="block text-on-surface-variant text-[10px] mb-2 uppercase tracking-[0.2em] font-bold">Entry Amount</label>
        <div 
          onClick={() => setIsKeypadOpen(true)}
          className="relative inline-flex items-baseline justify-center cursor-pointer group"
        >
          <span className="text-3xl font-headline font-extrabold text-on-surface-variant mr-2 group-hover:scale-110 transition-transform">{APP_CONFIG.currency}</span>
          <span className="text-6xl font-headline font-extrabold text-primary p-0 group-hover:scale-105 transition-transform">
            {amount}
          </span>
          <Pencil className="w-4 h-4 text-primary/30 ml-2 group-hover:text-primary transition-colors" />
        </div>
        
        <NumericKeypadModal 
          isOpen={isKeypadOpen} 
          onClose={() => setIsKeypadOpen(false)} 
          onConfirm={(val) => setAmount(val)}
          initialValue={amount}
        />
      </section>

      <div className="space-y-4">
        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/5">
          <label className="block text-on-surface-variant text-[10px] mb-4 uppercase tracking-widest font-bold">Transaction Title</label>
          <input 
            className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary-container font-bold" 
            placeholder="e.g. Weekly Groceries"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/5">
          <label className="block text-on-surface-variant text-[10px] mb-4 uppercase tracking-widest font-bold">Select Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 text-xs",
                  category === cat ? "bg-primary-fixed border-primary-container font-bold text-on-primary-fixed" : "bg-surface-container-low border-transparent text-on-surface-variant"
                )}
              >
                <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                <span>{cat}</span>
              </button>
            ))}
            {isAddingCategory ? (
              <div className="flex items-center gap-2 w-full">
                <input 
                  autoFocus
                  className="flex-grow bg-surface-container-high border-none rounded-full px-4 py-2 text-xs focus:ring-2 focus:ring-primary"
                  placeholder="Category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNewCategory()}
                />
                <button 
                  onClick={addNewCategory}
                  className="p-2 bg-primary text-on-primary rounded-full"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsAddingCategory(false)}
                  className="p-2 bg-surface-container-high text-on-surface-variant rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingCategory(true)}
                className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full border border-transparent text-on-surface-variant hover:bg-primary/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-bold">Add New</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1">
            <label className="block text-on-surface-variant text-[9px] uppercase tracking-wider font-bold">Date</label>
            <input 
              type="date" 
              className="bg-transparent border-none p-0 text-xs font-headline font-bold text-primary focus:ring-0 w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1">
            <label className="block text-on-surface-variant text-[9px] uppercase tracking-wider font-bold">Payment Method</label>
            <select 
              className="bg-transparent border-none p-0 text-xs font-headline font-bold text-primary focus:ring-0 w-full appearance-none"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/5">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">Description / Notes</label>
            <div className="flex items-center gap-2">
              {attachmentUrl && (
                <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-outline-variant/20">
                  <img src={attachmentUrl} alt="Attachment" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setAttachmentUrl(undefined)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary/5 px-2 py-1 rounded-lg transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{attachmentUrl ? 'Change' : 'Attach'}</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
          <textarea 
            className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary-container min-h-[100px] resize-none placeholder:text-on-surface-variant/50" 
            placeholder="Add some details about this transaction..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>
      </div>

      <div className="mt-8">
        <button 
          onClick={handleSave}
          className="w-full bg-primary text-on-primary py-4 rounded-2xl font-headline font-extrabold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          {id ? 'Update Transaction' : 'Save Transaction'}
        </button>
      </div>
    </motion.div>
  );
};
