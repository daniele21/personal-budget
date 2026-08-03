import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Transaction, TransactionReportingClass } from '../types';
import { useToast } from '../components/Toast';
import { useApp } from '../context/AppContext';
import { upsertRecurringOverride } from '../domain/recurring';
import { getLocalDateInputValue } from '../utils/dates';
import { attachmentRepository } from '../repositories/attachmentRepository';
import { TransactionEditor } from '../components/transactions/TransactionEditor';

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
        // Load attachment from IndexedDB
        attachmentRepository.getAttachment(id).then(val => {
          if (val) {
            setAttachmentUrl(val);
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
      await attachmentRepository.saveAttachment(transactionId, attachmentUrl);
    } else if (!attachmentUrl) {
      await attachmentRepository.deleteAttachment(transactionId);
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

  return (
    <TransactionEditor
      amount={amount}
      setAmount={setAmount}
      type={type}
      setType={setType}
      category={category}
      setCategory={setCategory}
      title={title}
      setTitle={setTitle}
      description={description}
      setDescription={setDescription}
      reportingClass={reportingClass}
      setReportingClass={setReportingClass}
      date={date}
      setDate={setDate}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      attachmentUrl={attachmentUrl}
      setAttachmentUrl={setAttachmentUrl}
      categories={categories}
      onAddCategory={(name) => {
        addCategory(name);
        setCategory(name);
      }}
      onSubmit={handleSave}
      submitLabel={`${id ? 'Update' : 'Save'} ${type}`}
      errors={{ title: titleError ?? undefined }}
      clearError={(field) => {
        if (field === 'title') setTitleError(null);
      }}
      initialMoreOptionsOpen={Boolean(
        attachmentUrl ||
        (editingTransaction && (
          editingTransaction.description ||
          editingTransaction.paymentMethod !== 'Debit Card' ||
          editingTransaction.attachmentUrl
        )),
      )}
      hideReportingTreatment={Boolean(editingTransaction?.sourceRecurringId)}
      recurringNotice={id && editingTransaction?.sourceRecurringId ? (
        <p className="rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-xs font-bold text-primary">
          This edit applies only to this recurring month
        </p>
      ) : undefined}
    />
  );
};
