import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Pencil, X, Camera } from 'lucide-react';
import { get, set, del } from 'idb-keyval';
import { cn } from '../lib/utils';
import { APP_CONFIG } from '../constants';
import { Transaction, TransactionReportingClass } from '../types';
import { CategoryPicker } from '../components/CategoryPicker';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { upsertRecurringOverride } from '../domain/recurring';
import { AccordionSection, Card } from '../components/ui';
import { ReportingTreatmentToggle } from '../components/ExtraFlagToggle';
import { ReportingTreatmentInfo } from '../components/ReportingTreatmentInfo';

export const AddTransaction = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { transactions, setTransactions, recurring, setRecurring, categories, addCategory } = useApp();
  const [amount, setAmount] = useState('0.00');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState(categories[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportingClass, setReportingClass] = useState<TransactionReportingClass | undefined>(undefined);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Debit Card');
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editingTransaction = id ? transactions.find((transaction) => transaction.id === id) : undefined;

  useEffect(() => {
    if (id) {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        setAmount(transaction.amount.toString());
        setType(transaction.type);
        setCategory(transaction.category);
        setTitle(transaction.title);
        setDescription(transaction.description);
        setReportingClass(!transaction.sourceRecurringId && transaction.reportingClass !== 'regular' ? transaction.reportingClass : undefined);
        setDate(new Date(transaction.date).toISOString().split('T')[0]);
        setPaymentMethod(transaction.paymentMethod);
        setIsMoreOptionsOpen(
          Boolean(
            transaction.description ||
            transaction.paymentMethod !== 'Debit Card' ||
            transaction.attachmentUrl,
          ),
        );
        
        // Load attachment from IndexedDB
        get(`attachment_${id}`).then(val => {
          if (val) {
            setAttachmentUrl(val);
            setIsMoreOptionsOpen(true);
          }
        });
      }
    }
  }, [id, transactions]);

  useEffect(() => {
    if (type !== 'income' && reportingClass === 'reimbursement') {
      setReportingClass(undefined);
    }
  }, [reportingClass, type]);

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
    const existingTransaction = id ? transactions.find((transaction) => transaction.id === id) : undefined;
    
    const newTransaction: Transaction = {
      id: transactionId,
      amount: parsedAmount,
      type,
      category,
      date: new Date(`${date}T00:00:00.000Z`).toISOString(),
      title: trimmedTitle,
      description: description.trim(),
      paymentMethod,
      // We store the flag in LocalStorage, but the actual data in IndexedDB
      attachmentUrl: attachmentUrl ? 'indexeddb' : undefined,
      sourceRecurringId: existingTransaction?.sourceRecurringId,
      sourceMonthKey: existingTransaction?.sourceMonthKey,
      recurringEdited: existingTransaction?.sourceRecurringId ? true : existingTransaction?.recurringEdited,
      reportingClass: existingTransaction?.sourceRecurringId ? undefined : reportingClass,
      reportingNote: undefined,
    };

    if (attachmentUrl && attachmentUrl !== 'indexeddb') {
      await set(`attachment_${transactionId}`, attachmentUrl);
    } else if (!attachmentUrl) {
      await del(`attachment_${transactionId}`);
    }

    if (id) {
      setTransactions(transactions.map(t => t.id === id ? newTransaction : t));

      if (existingTransaction?.sourceRecurringId && existingTransaction.sourceMonthKey) {
        const parentRecurring = recurring.find((bill) => bill.id === existingTransaction.sourceRecurringId);

        if (parentRecurring) {
          const nextRecurring = recurring.map((bill) => (
            bill.id === parentRecurring.id
              ? upsertRecurringOverride(bill, {
                monthKey: existingTransaction.sourceMonthKey,
                occurrenceKey: existingTransaction.sourceMonthKey,
                amount: newTransaction.amount,
                type: newTransaction.type,
                category: newTransaction.category,
                title: newTransaction.title,
                description: newTransaction.description,
                paymentMethod: newTransaction.paymentMethod,
                date: newTransaction.date,
              })
              : bill
          ));

          setRecurring(nextRecurring);
        }
      }
    } else {
      setTransactions([newTransaction, ...transactions]);
    }
    
    toast(
      existingTransaction?.sourceRecurringId
        ? 'Recurring transaction updated for this occurrence only!'
        : id
          ? 'Transaction updated!'
          : 'Transaction saved!',
      'success',
    );
    navigate('/transactions');
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

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-md mx-auto pb-24"
    >
      <div className="mx-auto mb-4 flex w-full max-w-[280px] rounded-full border border-outline-variant/15 bg-surface-container-low p-1">
        <button 
          type="button"
          onClick={() => setType('expense')}
          aria-pressed={type === 'expense'}
          className={cn(
            'min-h-10 flex-1 rounded-full px-4 py-2.5 font-headline text-xs font-bold transition-all',
            type === 'expense' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          Expense
        </button>
        <button 
          type="button"
          onClick={() => setType('income')}
          aria-pressed={type === 'income'}
          className={cn(
            'min-h-10 flex-1 rounded-full px-4 py-2.5 font-headline text-xs font-bold transition-all',
            type === 'income' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          Income
        </button>
      </div>

      <Card as="section" className="mb-4 p-5 text-center">
        <p className="mb-2 text-micro font-bold uppercase tracking-wide text-on-surface-variant">Amount</p>
        <button
          type="button"
          onClick={() => setIsKeypadOpen(true)}
          className="group relative inline-flex min-h-14 items-baseline justify-center rounded-2xl px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label={`Edit amount, currently ${APP_CONFIG.currency}${amount}`}
        >
          <span className="mr-2 font-headline text-2xl font-extrabold text-on-surface-variant">{APP_CONFIG.currency}</span>
          <span className="p-0 font-headline text-5xl font-extrabold tabular-nums text-primary transition-transform group-active:scale-[0.98]">
            {amount}
          </span>
          <Pencil className="ml-2 h-4 w-4 text-primary/40 transition-colors group-hover:text-primary" />
        </button>
        
        <NumericKeypadModal 
          isOpen={isKeypadOpen} 
          onClose={() => setIsKeypadOpen(false)} 
          onConfirm={(val) => setAmount(val)}
          initialValue={amount}
        />
      </Card>

      <div className="space-y-4">
        {id && editingTransaction?.sourceRecurringId && (
          <p className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs font-bold text-primary">
              This edit applies only to this recurring month
          </p>
        )}

        <Card className="space-y-5 p-5">
          <div>
            <label htmlFor="transaction-title" className="mb-2 block text-xs font-bold text-on-surface-variant">Title</label>
          <input 
            id="transaction-title"
            className="w-full rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/25"
            placeholder="e.g. Weekly Groceries"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          </div>

          <CategoryPicker
            categories={categories}
            value={category}
            onChange={setCategory}
            onAddCategory={(name) => { addCategory(name); setCategory(name); }}
          />
          <div className="flex flex-col gap-1 rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4">
            <label htmlFor="transaction-date" className="block text-on-surface-variant text-xs font-bold">Date</label>
            <input 
              id="transaction-date"
              type="date" 
              className="bg-transparent border-none p-0 text-xs font-headline font-bold text-primary focus:ring-0 w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </Card>

        {!editingTransaction?.sourceRecurringId && (
          <Card className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-on-surface-variant">Reporting treatment</p>
                <ReportingTreatmentInfo />
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                Keep extras and refunds distinct in reports.
              </p>
            </div>
            <ReportingTreatmentToggle
              value={reportingClass}
              type={type}
              onChange={setReportingClass}
            />
          </Card>
        )}

        <AccordionSection
          title="More options"
          description="Payment method, notes, attachment"
          open={isMoreOptionsOpen}
          onOpenChange={setIsMoreOptionsOpen}
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-1 rounded-2xl bg-surface-container-low p-4">
              <label htmlFor="transaction-payment-method" className="block text-on-surface-variant text-xs font-bold">Payment method</label>
            <select
              id="transaction-payment-method"
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

          <div className="flex items-center justify-between mb-3">
            <label htmlFor="transaction-notes" className="block text-on-surface-variant text-xs font-bold">Notes</label>
            <div className="flex items-center gap-2">
              {attachmentUrl && (
                <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-outline-variant/20">
                  <img src={attachmentUrl} alt="Attachment" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachmentUrl(undefined)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-primary text-micro font-bold hover:bg-primary/5 px-2 py-1 rounded-lg transition-colors"
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
            id="transaction-notes"
            className="w-full bg-surface-container-highest border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary-container min-h-[100px] resize-none placeholder:text-on-surface-variant/50"
            placeholder="Add some details about this transaction..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
          </div>
        </AccordionSection>
      </div>

      <div className="mt-8">
        <button 
          type="button"
          onClick={handleSave}
          className="w-full bg-primary text-on-primary py-4 rounded-2xl font-headline font-extrabold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          {id ? 'Update' : 'Save'} {type}
        </button>
      </div>
    </motion.div>
  );
};
