import type { AppData } from '../../../src/data/model';
import type { AuraPortablePreferences } from '../../../src/domain/archive';

export const E2E_ARCHIVE_PASSPHRASE = 'Aura-e2e-passphrase-2026';

export const E2E_ATTACHMENT = {
  transactionId: 'e2e-tx-receipt',
  dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
} as const;

export const E2E_APP_DATA: AppData = {
  transactions: [
    {
      id: E2E_ATTACHMENT.transactionId,
      amount: 86.45,
      type: 'expense',
      category: 'Groceries',
      date: '2026-07-20T00:00:00.000Z',
      title: 'Weekly groceries',
      description: 'Synthetic supermarket purchase',
      paymentMethod: 'Debit Card',
      attachmentUrl: 'indexeddb',
      verified: true,
    },
    {
      id: 'e2e-tx-salary',
      amount: 3_250,
      type: 'income',
      category: 'Salary',
      date: '2026-07-02T00:00:00.000Z',
      title: 'Monthly salary',
      description: 'Synthetic employer payment',
      paymentMethod: 'Bank Transfer',
    },
    {
      id: 'e2e-tx-extra',
      amount: 420,
      type: 'expense',
      category: 'Home',
      date: '2026-07-12T00:00:00.000Z',
      title: 'Emergency repair',
      description: 'Unexpected synthetic expense',
      paymentMethod: 'Credit Card',
      reportingClass: 'extra',
      reportingNote: 'One-off repair',
    },
    {
      id: 'e2e-tx-reimbursement',
      amount: 35,
      type: 'income',
      category: 'Groceries',
      date: '2026-07-16T00:00:00.000Z',
      title: 'Shared dinner reimbursement',
      description: 'Synthetic reimbursement',
      paymentMethod: 'Bank Transfer',
      reportingClass: 'reimbursement',
    },
    {
      id: 'e2e-tx-rent-2026-07',
      amount: 925,
      type: 'expense',
      category: 'Housing',
      date: '2026-07-01T00:00:00.000Z',
      title: 'Rent with adjustment',
      description: 'Synthetic recurring rent adjustment',
      paymentMethod: 'Bank Transfer',
      sourceRecurringId: 'e2e-rec-rent',
      sourceMonthKey: '2026-07',
      recurringEdited: true,
    },
  ],
  budgets: [
    { category: 'Groceries', limit: 450, spent: 86.45, currency: 'EUR' },
    { category: 'Home', limit: 600, spent: 420, currency: 'EUR' },
  ],
  recurring: [
    {
      id: 'e2e-rec-rent',
      name: 'Rent',
      amount: 900,
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      dayOfMonth: 1,
      category: 'Housing',
      type: 'expense',
      frequency: 'monthly',
      priority: true,
      reminder: { enabled: true, leadDays: 3 },
      overrides: [{
        monthKey: '2026-07',
        amount: 925,
        title: 'Rent with adjustment',
        description: 'Synthetic recurring rent adjustment',
        paymentMethod: 'Bank Transfer',
      }],
    },
  ],
  accounts: [
    {
      id: 'e2e-account-checking',
      name: 'Daily account',
      bank: 'Synthetic Bank',
      lastFour: '4242',
      openingBalance: 2_400,
      type: 'checking',
      status: 'active',
    },
    {
      id: 'e2e-account-savings',
      name: 'Emergency savings',
      bank: 'Synthetic Bank',
      lastFour: '8080',
      openingBalance: 7_500,
      type: 'savings',
      apy: '2.5%',
      status: 'active',
    },
  ],
  categories: ['Salary', 'Groceries', 'Housing', 'Home'],
  archivedCategories: ['Travel'],
  savingsGoals: [
    {
      id: 'e2e-goal-emergency',
      name: 'Emergency fund',
      targetAmount: 12_000,
      currentAmount: 7_500,
      targetDate: '2027-06-30T00:00:00.000Z',
      createdAt: '2026-01-10T09:00:00.000Z',
    },
  ],
  monthlyBudget: 2_350,
};

export const E2E_PREFERENCES: AuraPortablePreferences = {
  notificationPreferences: {
    enabled: true,
    budgetAlerts: true,
    recurringReminders: true,
    customReminders: true,
    reminderLeadDays: 2,
  },
  customReminders: [
    {
      id: 'e2e-reminder-insurance',
      title: 'Review insurance renewal',
      date: '2026-08-15T09:00:00.000Z',
      note: 'Synthetic reminder',
      completed: false,
      createdAt: '2026-07-01T09:00:00.000Z',
    },
  ],
  appearance: { darkMode: false },
};
