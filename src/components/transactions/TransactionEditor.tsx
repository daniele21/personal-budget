import React, { useEffect, useRef, useState } from 'react';
import { Camera, Pencil, X } from 'lucide-react';
import { motion } from 'motion/react';
import { APP_CONFIG } from '../../constants';
import type { TransactionReportingClass } from '../../types';
import { AccordionSection, Button, Card, SegmentedControl } from '../ui';
import { CategoryPicker } from '../CategoryPicker';
import { NumericKeypadModal } from '../NumericKeypadModal';
import { ReportingTreatmentToggle } from '../ExtraFlagToggle';
import { ReportingTreatmentInfo } from '../ReportingTreatmentInfo';
import { useToast } from '../Toast';

export interface TransactionEditorErrors {
  amount?: string;
  title?: string;
  category?: string;
  date?: string;
  paymentMethod?: string;
}

interface TransactionEditorProps {
  amount: string;
  setAmount: (value: string) => void;
  type: 'expense' | 'income';
  setType: (value: 'expense' | 'income') => void;
  category: string;
  setCategory: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  reportingClass?: TransactionReportingClass;
  setReportingClass: (value: TransactionReportingClass | undefined) => void;
  date: string;
  setDate: (value: string) => void;
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  attachmentUrl?: string;
  setAttachmentUrl: (value: string | undefined) => void;
  categories: string[];
  onAddCategory?: (name: string) => void;
  onSubmit: () => void | Promise<void>;
  submitLabel: string;
  errors?: TransactionEditorErrors;
  clearError?: (field: keyof TransactionEditorErrors) => void;
  initialMoreOptionsOpen?: boolean;
  allowNotesAndReceipt?: boolean;
  typeLocked?: boolean;
  busy?: boolean;
  context?: React.ReactNode;
  recurringNotice?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  stickyBottomClassName?: string;
  hideReportingTreatment?: boolean;
  categorySelectionRequired?: boolean;
  categoryHint?: string;
}

export function TransactionEditor({
  amount,
  setAmount,
  type,
  setType,
  category,
  setCategory,
  title,
  setTitle,
  description,
  setDescription,
  reportingClass,
  setReportingClass,
  date,
  setDate,
  paymentMethod,
  setPaymentMethod,
  attachmentUrl,
  setAttachmentUrl,
  categories,
  onAddCategory,
  onSubmit,
  submitLabel,
  errors = {},
  clearError,
  initialMoreOptionsOpen = false,
  allowNotesAndReceipt = true,
  typeLocked = false,
  busy = false,
  context,
  recurringNotice,
  secondaryAction,
  stickyBottomClassName = 'bottom-[4.25rem]',
  hideReportingTreatment = false,
  categorySelectionRequired = false,
  categoryHint,
}: TransactionEditorProps) {
  const { toast } = useToast();
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(
    initialMoreOptionsOpen,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialMoreOptionsOpen) setIsMoreOptionsOpen(true);
  }, [initialMoreOptionsOpen]);

  useEffect(() => {
    if (errors.title) titleInputRef.current?.focus();
  }, [errors.title]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('File is too large. Please select an image under 2MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setAttachmentUrl(reader.result as string);
    reader.readAsDataURL(file);
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
          void onSubmit();
        }}
        className="space-y-3"
      >
        {context}

        <Card
          as="section"
          aria-label={`${type === 'expense' ? 'Expense' : 'Income'} amount entry`}
          data-tour-id="add-entry"
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
              disabled={typeLocked}
              ariaLabel={typeLocked
                ? 'Transaction type, detected payments are expenses'
                : 'Transaction type'}
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
              aria-invalid={Boolean(errors.amount)}
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
            {errors.amount && (
              <p role="alert" className="mt-1 text-xs font-medium text-tertiary">
                {errors.amount}
              </p>
            )}
          </div>

          <NumericKeypadModal
            isOpen={isKeypadOpen}
            onClose={() => setIsKeypadOpen(false)}
            onConfirm={(value) => {
              setAmount(value);
              clearError?.('amount');
            }}
            initialValue={amount}
          />
        </Card>

        {recurringNotice}

        <Card tone="primary" colorized className="space-y-2 overflow-hidden p-2">
          <div data-tour-id="add-details" className="space-y-2">
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
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'transaction-title-error' : 'transaction-title-hint'}
                className={`min-h-12 w-full rounded-xl border bg-surface-container-lowest px-3.5 py-3 text-sm font-bold text-on-surface shadow-sm outline-none transition placeholder:font-normal placeholder:text-on-surface-variant/55 focus:ring-2 ${
                  errors.title
                    ? 'border-tertiary/60 focus:border-tertiary focus:ring-tertiary/15'
                    : 'border-inverse-on-surface/20 hover:border-inverse-on-surface/35 focus:border-inverse-accent/70 focus:ring-inverse-accent/25'
                }`}
                placeholder="e.g. Weekly groceries"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearError?.('title');
                }}
              />
              {errors.title ? (
                <p id="transaction-title-error" role="alert" className="mt-1.5 text-xs font-medium text-inverse-danger">
                  {errors.title}
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
                  onChange={(value) => {
                    setCategory(value);
                    clearError?.('category');
                  }}
                  onAddCategory={onAddCategory}
                  requiredSelection={categorySelectionRequired}
                />
              </div>
              <div className="flex min-h-16 min-w-0 flex-col justify-center bg-surface-container-lowest px-3.5 py-3 transition-colors focus-within:bg-primary/5 hover:bg-surface-container-low">
                <label htmlFor="transaction-date" className="mb-0.5 block text-micro font-bold text-on-surface-variant">Date</label>
                <input
                  id="transaction-date"
                  required
                  type="date"
                  aria-invalid={Boolean(errors.date)}
                  className="min-w-0 w-full border-0 bg-transparent p-0 font-headline text-xs font-bold text-primary focus:ring-0"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    clearError?.('date');
                  }}
                />
              </div>
            </div>
            {(errors.category || errors.date) && (
              <p role="alert" className="px-1 text-xs font-medium text-tertiary">
                {errors.category ?? errors.date}
              </p>
            )}
            {!errors.category && categorySelectionRequired && !category && categoryHint && (
              <p className="px-1 text-xs font-bold text-on-surface-variant">
                {categoryHint}
              </p>
            )}
          </div>

          {!hideReportingTreatment && (
            <div
              data-tour-id="reporting-treatment"
              className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 shadow-sm transition-colors ${
                reportingClass === 'extra'
                  ? 'border-accent-amber/30 bg-accent-amber/10 shadow-accent-amber/5'
                  : reportingClass === 'reimbursement'
                    ? 'border-secondary/30 bg-secondary/10 shadow-secondary/5'
                    : 'border-outline-variant/20 bg-surface-container-lowest shadow-primary/5'
              }`}
            >
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

          <div data-tour-id="add-more-options">
            <AccordionSection
              title="More options"
              description={allowNotesAndReceipt ? 'Payment, notes & receipt' : 'Payment method'}
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
                    aria-invalid={Boolean(errors.paymentMethod)}
                    className="w-full appearance-none border-0 bg-transparent p-0 font-headline text-xs font-bold text-primary focus:ring-0"
                    value={paymentMethod}
                    onChange={(event) => {
                      setPaymentMethod(event.target.value);
                      clearError?.('paymentMethod');
                    }}
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                {errors.paymentMethod && (
                  <p role="alert" className="text-xs font-medium text-tertiary">
                    {errors.paymentMethod}
                  </p>
                )}

                {allowNotesAndReceipt && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="transaction-notes" className="text-micro font-bold text-on-surface-variant">Notes</label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
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
                      onChange={(event) => setDescription(event.target.value)}
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
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </AccordionSection>
          </div>
        </Card>

        {secondaryAction}

        <div className={`sticky ${stickyBottomClassName} z-20 -mx-1 rounded-2xl bg-surface/90 p-1 backdrop-blur-md`}>
          <Button type="submit" fullWidth disabled={busy} className="min-h-12 rounded-2xl text-sm">
            {busy ? 'Saving securely…' : submitLabel}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
