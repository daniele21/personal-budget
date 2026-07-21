import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Pencil, X, Camera } from 'lucide-react';
import { get, set, del } from 'idb-keyval';
import { APP_CONFIG } from '../constants';
import { Transaction, TransactionReportingClass } from '../types';
import { CategoryPicker } from '../components/CategoryPicker';
import { NumericKeypadModal } from '../components/NumericKeypadModal';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { upsertRecurringOverride } from '../domain/recurring';
import { AccordionSection, Button, Card, SegmentedControl } from '../components/ui';
import { ReportingTreatmentToggle } from '../components/ExtraFlagToggle';
import { ReportingTreatmentInfo } from '../components/ReportingTreatmentInfo';
import { getLocalDateInputValue } from '../utils/dates';

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
  const [date, setDate] = useState(() => getLocalDateInputValue());
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="mx-auto max-w-md pb-20"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        className="space-y-3"
      >
        <Card as="section" className="overflow-hidden p-0 text-center">
          <div className="border-b border-outline-variant/10 p-2.5">
            <SegmentedControl
              value={type}
              onChange={setType}
              ariaLabel="Transaction type"
              className="w-full border-0 bg-surface-container-low"
              optionClassName="min-h-9"
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
            />
          </div>

          <div className="px-4 py-4">
            <p className="mb-1 text-micro font-bold uppercase tracking-wide text-on-surface-variant">Amount</p>
            <button
              type="button"
              onClick={() => setIsKeypadOpen(true)}
              className="group relative inline-flex min-h-12 max-w-full items-baseline justify-center rounded-xl px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={`Edit amount, currently ${APP_CONFIG.currency}${amount}`}
            >
              <span className="mr-1.5 font-headline text-xl font-bold text-on-surface-variant">{APP_CONFIG.currency}</span>
              <span className="truncate font-headline text-4xl font-extrabold tabular-nums text-primary transition-transform group-active:scale-[0.98]">
                {amount}
              </span>
              <Pencil className="ml-2 h-3.5 w-3.5 shrink-0 text-primary/45 transition-colors group-hover:text-primary" />
            </button>
          </div>

          <NumericKeypadModal
            isOpen={isKeypadOpen}
            onClose={() => setIsKeypadOpen(false)}
            onConfirm={(val) => setAmount(val)}
            initialValue={amount}
          />
        </Card>

        {id && editingTransaction?.sourceRecurringId && (
          <p className="rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-xs font-bold text-primary">
            This edit applies only to this recurring month
          </p>
        )}

        <Card className="overflow-hidden p-0">
          <div className="px-3.5 py-3">
            <label htmlFor="transaction-title" className="mb-1.5 block text-micro font-bold text-on-surface-variant">Title</label>
            <input
              id="transaction-title"
              required
              className="w-full border-0 bg-transparent p-0 text-sm font-bold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-variant/60 focus:ring-0"
              placeholder="Weekly groceries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 border-t border-outline-variant/10">
            <CategoryPicker
              categories={categories}
              value={category}
              density="compact"
              onChange={setCategory}
              onAddCategory={(name) => { addCategory(name); setCategory(name); }}
            />
            <div className="flex min-h-16 min-w-0 flex-col justify-center border-l border-outline-variant/10 px-3.5 py-3">
              <label htmlFor="transaction-date" className="mb-0.5 block text-micro font-bold text-on-surface-variant">Date</label>
              <input
                id="transaction-date"
                required
                type="date"
                className="min-w-0 w-full border-0 bg-transparent p-0 font-headline text-xs font-bold text-primary focus:ring-0"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {!editingTransaction?.sourceRecurringId && (
            <div className="flex min-h-14 items-center justify-between gap-3 border-t border-outline-variant/10 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-1">
                <p className="text-xs font-bold text-on-surface-variant">Treatment</p>
                <ReportingTreatmentInfo />
              </div>
              <ReportingTreatmentToggle
                value={reportingClass}
                type={type}
                onChange={setReportingClass}
              />
            </div>
          )}

          <AccordionSection
            title="More options"
            description="Payment, notes & receipt"
            open={isMoreOptionsOpen}
            onOpenChange={setIsMoreOptionsOpen}
            className="rounded-none border-x-0 border-b-0 bg-transparent shadow-none"
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3">
                <label htmlFor="transaction-payment-method" className="text-micro font-bold text-on-surface-variant">Payment method</label>
                <select
                  id="transaction-payment-method"
                  className="w-full appearance-none border-0 bg-transparent p-0 font-headline text-xs font-bold text-primary focus:ring-0"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label htmlFor="transaction-notes" className="text-micro font-bold text-on-surface-variant">Notes</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{attachmentUrl ? 'Change receipt' : 'Add receipt'}</span>
                </button>
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
                className="min-h-20 w-full resize-none rounded-xl border-0 bg-surface-container-low p-3 text-sm text-on-surface placeholder:text-on-surface-variant/55 focus:ring-2 focus:ring-primary/25"
                placeholder="Optional details"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {attachmentUrl && (
                <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2">
                  <img src={attachmentUrl} alt="Attached receipt preview" className="h-10 w-10 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-on-surface">Receipt attached</span>
                  <button
                    type="button"
                    onClick={() => setAttachmentUrl(undefined)}
                    aria-label="Remove attached receipt"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-tertiary-container hover:text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </AccordionSection>
        </Card>

        <div className="sticky bottom-[4.25rem] z-20 -mx-1 rounded-2xl bg-surface/90 p-1 backdrop-blur-md">
          <Button type="submit" fullWidth className="min-h-12 rounded-2xl text-sm">
            {id ? 'Update' : 'Save'} {type}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};
