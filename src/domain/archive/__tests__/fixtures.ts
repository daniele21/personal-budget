import type { AppData } from '../../../data/model';
import type {
  AuraArchiveAttachment,
  AuraArchivePayloadV1,
  AuraPortablePreferences,
} from '../archiveTypes';
import {
  AURA_ARCHIVE_CRYPTO,
  AURA_ARCHIVE_FORMAT,
  AURA_ARCHIVE_FORMAT_VERSION,
  AURA_ARCHIVE_MEDIA_TYPE,
  AURA_ARCHIVE_SCHEMA_VERSION,
} from '../archiveConstants';
import { calculateArchiveChecksums } from '../archiveIntegrity';
import { buildArchiveCounts } from '../archiveValidation';

export const TEST_ATTACHMENT: AuraArchiveAttachment = {
  transactionId: 'tx-receipt',
  mediaType: 'image/png',
  byteLength: 3,
  dataUrl: 'data:image/png;base64,AQID',
};

export const TEST_APP_DATA: AppData = {
  transactions: [
    {
      id: 'tx-receipt',
      amount: 42.5,
      type: 'expense',
      category: 'Food',
      date: '2026-07-20T00:00:00.000Z',
      title: 'Groceries',
      description: 'Weekly shop',
      paymentMethod: 'Debit Card',
      attachmentUrl: 'indexeddb',
      reportingClass: 'regular',
    },
    {
      id: 'tx-rent-2026-07',
      amount: 900,
      type: 'expense',
      category: 'Housing',
      date: '2026-07-01T00:00:00.000Z',
      title: 'Rent',
      description: 'Auto-generated from recurring: Rent',
      paymentMethod: 'Bank Transfer',
      sourceRecurringId: 'rec-rent',
      sourceMonthKey: '2026-07',
    },
  ],
  budgets: [
    { category: 'Food', limit: 500, spent: 42.5, currency: 'EUR' },
  ],
  recurring: [
    {
      id: 'rec-rent',
      name: 'Rent',
      amount: 900,
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      dayOfMonth: 1,
      category: 'Housing',
      type: 'expense',
      frequency: 'monthly',
      reminder: { enabled: true, leadDays: 2 },
      overrides: [],
    },
  ],
  accounts: [
    {
      id: 'account-main',
      name: 'Main account',
      bank: 'Example Bank',
      lastFour: '1234',
      openingBalance: 1_500,
      type: 'checking',
    },
  ],
  categories: ['Food', 'Housing'],
  archivedCategories: ['Travel'],
  savingsGoals: [
    {
      id: 'goal-emergency',
      name: 'Emergency fund',
      targetAmount: 5_000,
      currentAmount: 1_000,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  monthlyBudget: 2_000,
};

export const TEST_PREFERENCES: AuraPortablePreferences = {
  notificationPreferences: {
    enabled: true,
    budgetAlerts: true,
    recurringReminders: true,
    customReminders: true,
    reminderLeadDays: 1,
  },
  customReminders: [
    {
      id: 'reminder-tax',
      title: 'Review tax payment',
      date: '2026-08-01T09:00:00.000Z',
      note: 'Check the final amount',
      completed: false,
      createdAt: '2026-07-01T09:00:00.000Z',
    },
  ],
  appearance: { darkMode: true },
};

export const TEST_ENCRYPTED_HEADER = {
  archiveFormat: AURA_ARCHIVE_FORMAT,
  formatVersion: AURA_ARCHIVE_FORMAT_VERSION,
  mediaType: AURA_ARCHIVE_MEDIA_TYPE,
  payloadByteLength: 128,
  encryption: {
    mode: 'passphrase',
    algorithm: AURA_ARCHIVE_CRYPTO.algorithm,
    keyLengthBits: AURA_ARCHIVE_CRYPTO.keyLengthBits,
    authenticationTagBits: AURA_ARCHIVE_CRYPTO.authenticationTagBits,
    kdf: AURA_ARCHIVE_CRYPTO.kdf,
    kdfHash: AURA_ARCHIVE_CRYPTO.kdfHash,
    kdfIterations: AURA_ARCHIVE_CRYPTO.kdfIterations,
    saltBase64: 'AAAAAAAAAAAAAAAAAAAAAA==',
    ivBase64: 'AAAAAAAAAAAAAAAA',
  },
} as const;

export const LEGACY_NORMALIZABLE_APP_DATA = {
  ...structuredClone(TEST_APP_DATA),
  accounts: [{
    id: 'legacy-account',
    name: 'Legacy account',
    bank: 'Example Bank',
    lastFour: '4321',
    balance: 750,
    type: 'checking',
  }],
};

export function buildLargeAppData(transactionCount = 5_000): AppData {
  return {
    ...structuredClone(TEST_APP_DATA),
    transactions: Array.from({ length: transactionCount }, (_, index) => ({
      ...TEST_APP_DATA.transactions[0],
      id: `tx-large-${index}`,
      attachmentUrl: undefined,
      amount: index + 0.5,
    })),
  };
}

export async function buildEmptyArchivePayload(): Promise<AuraArchivePayloadV1> {
  return buildValidArchivePayload({
    data: {
      transactions: [],
      budgets: [],
      recurring: [],
      accounts: [],
      categories: [],
      archivedCategories: [],
      savingsGoals: [],
      monthlyBudget: 0,
    },
    preferences: {
      notificationPreferences: {
        enabled: false,
        budgetAlerts: true,
        recurringReminders: true,
        customReminders: true,
        reminderLeadDays: 1,
      },
      customReminders: [],
      appearance: { darkMode: false },
    },
    attachments: [],
  });
}

export async function buildValidArchivePayload(
  overrides: Partial<Pick<AuraArchivePayloadV1, 'data' | 'preferences' | 'attachments'>> = {},
): Promise<AuraArchivePayloadV1> {
  const data = overrides.data ?? structuredClone(TEST_APP_DATA);
  const preferences = overrides.preferences ?? structuredClone(TEST_PREFERENCES);
  const attachments = overrides.attachments ?? [structuredClone(TEST_ATTACHMENT)];
  const checksums = await calculateArchiveChecksums({ data, preferences, attachments });

  return {
    manifest: {
      archiveFormat: AURA_ARCHIVE_FORMAT,
      formatVersion: AURA_ARCHIVE_FORMAT_VERSION,
      schemaVersion: AURA_ARCHIVE_SCHEMA_VERSION,
      createdAt: '2026-07-22T10:00:00.000Z',
      sourceAppVersion: '1.0.0-test',
      sourceBuildSha: 'test-build',
      archiveId: 'archive-test-1',
      counts: buildArchiveCounts(data, preferences, attachments),
      checksums,
    },
    data,
    preferences,
    attachments,
  };
}
