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
  const [titleError, setTitleError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [reportingClass, setReportingClass] = useState<TransactionReportingClass | undefined>(undefined);
  const [date, setDate] = useState(() => getLocalDateInputValue());
  const [paymentMethod, setPaymentMethod] = useState('Debit Card');
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
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
      setTitleError('Enter a title to describe this transaction.');
      titleInputRef.current?.focus();
      toast('Please enter a title', 'warning');
      return;
    }

    setTitleError(null);

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
        <Card
          as="section"
          aria-label={`${type === 'expense' ? 'Expense' : 'Income'} amount entry`}
          data-transaction-type={type}
          className="relative overflow-hidden p-0 text-center"
        >
          <motion.div
            key={type}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={`aura-transaction-entry-wash aura-transaction-entry-wash-${type}`}
          />

          <div className="relative z-[1] border-b border-outline-variant/15 p-2.5">
            <SegmentedControl
              value={type}
              onChange={setType}
              ariaLabel="Transaction type"
              tone={type === 'income' ? 'positive' : 'primary'}
              className="w-full border-0 bg-surface-container-low"
              optionClassName="min-h-9"
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
            />
          </div>

          <div className="relative z-[1] px-4 py-4">
            <p className={`mb-1 text-micro font-bold uppercase tracking-wide ${
              type === 'income' ? 'text-secondary' : 'text-primary'
            }`}>Amount</p>
            <button
              type="button"
              onClick={() => setIsKeypadOpen(true)}
              className="group relative inline-flex min-h-12 max-w-full items-baseline justify-center rounded-xl px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label={`Edit amount, currently ${APP_CONFIG.currency}${amount}`}
            >
              <span className={`mr-1.5 font-headline text-xl font-bold ${
                type === 'income' ? 'text-secondary/70' : 'text-primary/70'
              }`}>{APP_CONFIG.currency}</span>
              <span className={`truncate font-headline text-4xl font-extrabold tabular-nums transition-colors group-active:scale-[0.98] ${
                type === 'income' ? 'text-secondary' : 'text-primary'
              }`}>
                {amount}
              </span>
              <Pencil className={`ml-2 h-3.5 w-3.5 shrink-0 transition-colors ${
                type === 'income'
                  ? 'text-secondary/45 group-hover:text-secondary'
                  : 'text-primary/45 group-hover:text-primary'
              }`} />
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

        <Card tone="primary" colorized className="space-y-2 overflow-hidden p-2">
          <div className="aura-card-inverse px-3.5 py-3.5">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="transaction-title" className="text-micro font-extrabold uppercase tracking-wide text-inverse-on-surface-variant">
                Transaction title
              </label>
              <span className="rounded-full bg-inverse-on-surface/10 px-2 py-1 text-micro font-bold text-inverse-on-surface ring-1 ring-inset ring-inverse-on-surface/15">
                Required
              </span>
            </div>
            <input
              ref={titleInputRef}
              id="transaction-title"
              required
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? 'transaction-title-error' : 'transaction-title-hint'}
              className={`min-h-12 w-full rounded-xl border bg-surface-container-lowest px-3.5 py-3 text-sm font-bold text-on-surface shadow-sm outline-none transition placeholder:font-normal placeholder:text-on-surface-variant/55 focus:ring-2 ${
                titleError
                  ? 'border-tertiary/60 focus:border-tertiary focus:ring-tertiary/15'
                  : 'border-inverse-on-surface/20 hover:border-inverse-on-surface/35 focus:border-inverse-accent/70 focus:ring-inverse-accent/25'
              }`}
              placeholder="e.g. Weekly groceries"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
            />
            {titleError ? (
              <p id="transaction-title-error" role="alert" className="mt-1.5 text-xs font-medium text-inverse-danger">
                {titleError}
              </p>
            ) : (
              <p id="transaction-title-hint" className="mt-1.5 text-xs text-inverse-on-surface-variant">
                Briefly describe this transaction
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-outline-variant/20 bg-outline-variant/30 shadow-sm shadow-primary/5">
            <div className="bg-surface-container-lowest">
              <CategoryPicker
                categories={categories}
                value={category}
                density="compact"
                onChange={setCategory}
                onAddCategory={(name) => { addCategory(name); setCategory(name); }}
              />
            </div>
            <div className="flex min-h-16 min-w-0 flex-col justify-center bg-surface-container-lowest px-3.5 py-3 transition-colors focus-within:bg-primary/5 hover:bg-surface-container-low">
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
            <div className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 shadow-sm transition-colors ${
              reportingClass === 'extra'
                ? 'border-accent-amber/30 bg-accent-amber/10 shadow-accent-amber/5'
                : reportingClass === 'reimbursement'
                  ? 'border-secondary/30 bg-secondary/10 shadow-secondary/5'
                  : 'border-outline-variant/20 bg-surface-container-lowest shadow-primary/5'
            }`}>
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
            statusColor="primary"
            className={`rounded-2xl border-outline-variant/20 shadow-sm shadow-primary/5 transition-colors ${
              isMoreOptionsOpen ? 'bg-primary/5' : 'bg-surface-container-lowest'
            }`}
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
