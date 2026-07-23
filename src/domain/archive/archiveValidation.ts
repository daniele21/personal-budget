import { normalizeAppData, type AppData } from '../../data/model';
import {
  AURA_ARCHIVE_CRYPTO,
  AURA_ARCHIVE_FORMAT,
  AURA_ARCHIVE_FORMAT_VERSION,
  AURA_ARCHIVE_LIMITS,
  AURA_ARCHIVE_MEDIA_TYPE,
  AURA_ARCHIVE_SCHEMA_VERSION,
} from './archiveConstants';
import { ArchiveValidationError, UnsupportedArchiveVersionError } from './archiveErrors';
import { migrateArchivePayload } from './archiveMigrations';
import { parseAttachmentDataUrl } from './attachmentData';
import type {
  ArchiveIssue,
  ArchiveValidationResult,
  AuraArchiveAttachment,
  AuraArchiveCounts,
  AuraArchiveHeaderV1,
  AuraArchiveManifestV1,
  AuraArchivePayloadV1,
  AuraPortablePreferences,
} from './archiveTypes';

type UnknownRecord = Record<string, unknown>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function base64ByteLength(value: string): number | null {
  if (!BASE64_PATTERN.test(value) || value.length % 4 !== 0) return null;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

class IssueCollector {
  readonly issues: ArchiveIssue[] = [];

  error(code: string, message: string, path: string): void {
    this.issues.push({ code, message, path, severity: 'error' });
  }

  warning(code: string, message: string, path: string): void {
    this.issues.push({ code, message, path, severity: 'warning' });
  }

  throwIfErrors(): void {
    const errors = this.issues.filter((issue) => issue.severity === 'error');
    if (errors.length > 0) throw new ArchiveValidationError(this.issues);
  }

  warnings(): ArchiveIssue[] {
    return this.issues.filter((issue) => issue.severity === 'warning');
  }
}

function requireRecord(value: unknown, path: string, collector: IssueCollector): UnknownRecord | null {
  if (!isRecord(value)) {
    collector.error('invalid_object', `${path} must be an object.`, path);
    return null;
  }
  return value;
}

function checkKeys(
  record: UnknownRecord,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  collector: IssueCollector,
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!(key in record)) {
      collector.error('missing_field', `${path}.${key} is required.`, `${path}.${key}`);
    }
  }
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      collector.error('unknown_field', `${path}.${key} is not supported by schema V1.`, `${path}.${key}`);
    }
  }
}

function stringField(
  record: UnknownRecord,
  key: string,
  path: string,
  collector: IssueCollector,
  options: { optional?: boolean; allowEmpty?: boolean; maxLength?: number } = {},
): string | undefined {
  const value = record[key];
  if (value === undefined && options.optional) return undefined;
  if (typeof value !== 'string') {
    collector.error('invalid_string', `${path}.${key} must be a string.`, `${path}.${key}`);
    return undefined;
  }
  if (!options.allowEmpty && value.trim().length === 0) {
    collector.error('empty_string', `${path}.${key} cannot be empty.`, `${path}.${key}`);
  }
  if (value.length > (options.maxLength ?? 20_000)) {
    collector.error('string_too_long', `${path}.${key} is too long.`, `${path}.${key}`);
  }
  return value;
}

function booleanField(
  record: UnknownRecord,
  key: string,
  path: string,
  collector: IssueCollector,
  optional = false,
): boolean | undefined {
  const value = record[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'boolean') {
    collector.error('invalid_boolean', `${path}.${key} must be a boolean.`, `${path}.${key}`);
    return undefined;
  }
  return value;
}

function numberField(
  record: UnknownRecord,
  key: string,
  path: string,
  collector: IssueCollector,
  options: { optional?: boolean; min?: number; integer?: boolean } = {},
): number | undefined {
  const value = record[key];
  if (value === undefined && options.optional) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    collector.error('invalid_number', `${path}.${key} must be a finite number.`, `${path}.${key}`);
    return undefined;
  }
  if (options.min !== undefined && value < options.min) {
    collector.error('number_out_of_range', `${path}.${key} must be at least ${options.min}.`, `${path}.${key}`);
  }
  if (options.integer && !Number.isInteger(value)) {
    collector.error('invalid_integer', `${path}.${key} must be an integer.`, `${path}.${key}`);
  }
  return value;
}

function enumField<T extends string>(
  record: UnknownRecord,
  key: string,
  values: readonly T[],
  path: string,
  collector: IssueCollector,
  optional = false,
): T | undefined {
  const value = record[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'string' || !values.includes(value as T)) {
    collector.error('invalid_enum', `${path}.${key} has an unsupported value.`, `${path}.${key}`);
    return undefined;
  }
  return value as T;
}

function dateField(
  record: UnknownRecord,
  key: string,
  path: string,
  collector: IssueCollector,
  optional = false,
): string | undefined {
  const value = stringField(record, key, path, collector, { optional });
  if (value !== undefined && !Number.isFinite(Date.parse(value))) {
    collector.error('invalid_date', `${path}.${key} must be a recoverable date.`, `${path}.${key}`);
  }
  return value;
}

function arrayField(record: UnknownRecord, key: string, path: string, collector: IssueCollector): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    collector.error('invalid_array', `${path}.${key} must be an array.`, `${path}.${key}`);
    return [];
  }
  return value;
}

function validateTransaction(value: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(value, path, collector);
  if (!record) return;
  checkKeys(record,
    ['id', 'amount', 'type', 'category', 'date', 'title', 'description', 'paymentMethod'],
    ['attachmentUrl', 'verified', 'sourceRecurringId', 'sourceMonthKey', 'recurringEdited', 'reportingClass', 'reportingNote'],
    path, collector);
  stringField(record, 'id', path, collector, { maxLength: 256 });
  numberField(record, 'amount', path, collector, { min: Number.MIN_VALUE });
  enumField(record, 'type', ['expense', 'income'] as const, path, collector);
  stringField(record, 'category', path, collector, { maxLength: 256 });
  dateField(record, 'date', path, collector);
  stringField(record, 'title', path, collector, { maxLength: 2_000 });
  stringField(record, 'description', path, collector, { allowEmpty: true });
  stringField(record, 'paymentMethod', path, collector, { maxLength: 256 });
  stringField(record, 'attachmentUrl', path, collector, { optional: true, maxLength: 64 });
  booleanField(record, 'verified', path, collector, true);
  stringField(record, 'sourceRecurringId', path, collector, { optional: true, maxLength: 256 });
  stringField(record, 'sourceMonthKey', path, collector, { optional: true, maxLength: 64 });
  booleanField(record, 'recurringEdited', path, collector, true);
  enumField(record, 'reportingClass', ['regular', 'extra', 'reimbursement'] as const, path, collector, true);
  stringField(record, 'reportingNote', path, collector, { optional: true, allowEmpty: true, maxLength: 2_000 });
}

function validateBudget(value: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(value, path, collector);
  if (!record) return;
  checkKeys(record, ['category', 'limit', 'spent', 'currency'], [], path, collector);
  stringField(record, 'category', path, collector, { maxLength: 256 });
  numberField(record, 'limit', path, collector, { min: 0 });
  numberField(record, 'spent', path, collector, { min: 0 });
  stringField(record, 'currency', path, collector, { maxLength: 16 });
}

function validateRecurringOverride(value: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(value, path, collector);
  if (!record) return;
  checkKeys(record, ['monthKey'], ['occurrenceKey', 'amount', 'type', 'category', 'title', 'description', 'paymentMethod', 'date', 'skipped'], path, collector);
  stringField(record, 'monthKey', path, collector, { maxLength: 64 });
  stringField(record, 'occurrenceKey', path, collector, { optional: true, maxLength: 64 });
  numberField(record, 'amount', path, collector, { optional: true, min: Number.MIN_VALUE });
  enumField(record, 'type', ['expense', 'income'] as const, path, collector, true);
  stringField(record, 'category', path, collector, { optional: true, maxLength: 256 });
  stringField(record, 'title', path, collector, { optional: true, maxLength: 2_000 });
  stringField(record, 'description', path, collector, { optional: true, allowEmpty: true });
  stringField(record, 'paymentMethod', path, collector, { optional: true, maxLength: 256 });
  dateField(record, 'date', path, collector, true);
  booleanField(record, 'skipped', path, collector, true);
}

function validateRecurring(value: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(value, path, collector);
  if (!record) return;
  checkKeys(record,
    ['id', 'name', 'amount', 'startDate', 'endDate', 'dayOfMonth', 'category'],
    ['type', 'frequency', 'priority', 'reminder', 'overrides', 'dueDate'],
    path, collector);
  stringField(record, 'id', path, collector, { maxLength: 256 });
  stringField(record, 'name', path, collector, { maxLength: 2_000 });
  numberField(record, 'amount', path, collector, { min: Number.MIN_VALUE });
  dateField(record, 'startDate', path, collector);
  dateField(record, 'endDate', path, collector);
  numberField(record, 'dayOfMonth', path, collector, { min: 1, integer: true });
  stringField(record, 'category', path, collector, { maxLength: 256 });
  enumField(record, 'type', ['expense', 'income'] as const, path, collector, true);
  enumField(record, 'frequency', ['daily', 'weekly', 'monthly', 'yearly'] as const, path, collector, true);
  booleanField(record, 'priority', path, collector, true);
  dateField(record, 'dueDate', path, collector, true);

  if (record.reminder !== undefined) {
    const reminder = requireRecord(record.reminder, `${path}.reminder`, collector);
    if (reminder) {
      checkKeys(reminder, ['enabled', 'leadDays'], [], `${path}.reminder`, collector);
      booleanField(reminder, 'enabled', `${path}.reminder`, collector);
      numberField(reminder, 'leadDays', `${path}.reminder`, collector, { min: 0, integer: true });
    }
  }

  if (record.overrides !== undefined) {
    if (!Array.isArray(record.overrides)) {
      collector.error('invalid_array', `${path}.overrides must be an array.`, `${path}.overrides`);
    } else {
      record.overrides.forEach((override, index) => validateRecurringOverride(override, `${path}.overrides[${index}]`, collector));
    }
  }
}

function validateAccount(value: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(value, path, collector);
  if (!record) return;
  checkKeys(record, ['id', 'name', 'bank', 'lastFour', 'openingBalance', 'type'], ['apy', 'status'], path, collector);
  stringField(record, 'id', path, collector, { maxLength: 256 });
  stringField(record, 'name', path, collector, { maxLength: 2_000 });
  stringField(record, 'bank', path, collector, { allowEmpty: true, maxLength: 2_000 });
  stringField(record, 'lastFour', path, collector, { allowEmpty: true, maxLength: 32 });
  numberField(record, 'openingBalance', path, collector);
  enumField(record, 'type', ['checking', 'savings', 'credit', 'cash'] as const, path, collector);
  stringField(record, 'apy', path, collector, { optional: true, allowEmpty: true, maxLength: 64 });
  stringField(record, 'status', path, collector, { optional: true, allowEmpty: true, maxLength: 64 });
}

function validateSavingsGoal(value: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(value, path, collector);
  if (!record) return;
  checkKeys(record, ['id', 'name', 'targetAmount', 'currentAmount', 'createdAt'], ['targetDate'], path, collector);
  stringField(record, 'id', path, collector, { maxLength: 256 });
  stringField(record, 'name', path, collector, { maxLength: 2_000 });
  numberField(record, 'targetAmount', path, collector, { min: Number.MIN_VALUE });
  numberField(record, 'currentAmount', path, collector, { min: 0 });
  dateField(record, 'targetDate', path, collector, true);
  dateField(record, 'createdAt', path, collector);
}

function validateNotificationPreferences(value: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(value, path, collector);
  if (!record) return;
  checkKeys(record, ['enabled', 'budgetAlerts', 'recurringReminders', 'customReminders', 'reminderLeadDays'], [], path, collector);
  booleanField(record, 'enabled', path, collector);
  booleanField(record, 'budgetAlerts', path, collector);
  booleanField(record, 'recurringReminders', path, collector);
  booleanField(record, 'customReminders', path, collector);
  numberField(record, 'reminderLeadDays', path, collector, { min: 0, integer: true });
}

function validateCustomReminder(value: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(value, path, collector);
  if (!record) return;
  checkKeys(record, ['id', 'title', 'date', 'createdAt'], ['note', 'completed'], path, collector);
  stringField(record, 'id', path, collector, { maxLength: 256 });
  stringField(record, 'title', path, collector, { maxLength: 2_000 });
  dateField(record, 'date', path, collector);
  stringField(record, 'note', path, collector, { optional: true, allowEmpty: true });
  booleanField(record, 'completed', path, collector, true);
  dateField(record, 'createdAt', path, collector);
}

function reportDuplicates(items: unknown[], key: string, path: string, collector: IssueCollector): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (!isRecord(item) || typeof item[key] !== 'string') return;
    const value = item[key] as string;
    if (seen.has(value)) {
      collector.error('duplicate_id', `${path} contains duplicate ${key} "${value}".`, `${path}[${index}].${key}`);
    }
    seen.add(value);
  });
}

function validateAppDataInto(input: unknown, path: string, collector: IssueCollector): AppData | null {
  const record = requireRecord(input, path, collector);
  if (!record) return null;
  checkKeys(record,
    ['transactions', 'budgets', 'recurring', 'accounts', 'categories', 'archivedCategories', 'savingsGoals', 'monthlyBudget'],
    [], path, collector);

  const transactions = arrayField(record, 'transactions', path, collector);
  const budgets = arrayField(record, 'budgets', path, collector);
  const recurring = arrayField(record, 'recurring', path, collector);
  const accounts = arrayField(record, 'accounts', path, collector);
  const categories = arrayField(record, 'categories', path, collector);
  const archivedCategories = arrayField(record, 'archivedCategories', path, collector);
  const savingsGoals = arrayField(record, 'savingsGoals', path, collector);
  numberField(record, 'monthlyBudget', path, collector, { min: 0 });

  transactions.forEach((item, index) => validateTransaction(item, `${path}.transactions[${index}]`, collector));
  budgets.forEach((item, index) => validateBudget(item, `${path}.budgets[${index}]`, collector));
  recurring.forEach((item, index) => validateRecurring(item, `${path}.recurring[${index}]`, collector));
  accounts.forEach((item, index) => validateAccount(item, `${path}.accounts[${index}]`, collector));
  savingsGoals.forEach((item, index) => validateSavingsGoal(item, `${path}.savingsGoals[${index}]`, collector));
  categories.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      collector.error('invalid_category', `${path}.categories[${index}] must be a non-empty string.`, `${path}.categories[${index}]`);
    }
  });
  archivedCategories.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      collector.error('invalid_category', `${path}.archivedCategories[${index}] must be a non-empty string.`, `${path}.archivedCategories[${index}]`);
    }
  });

  reportDuplicates(transactions, 'id', `${path}.transactions`, collector);
  reportDuplicates(recurring, 'id', `${path}.recurring`, collector);
  reportDuplicates(accounts, 'id', `${path}.accounts`, collector);
  reportDuplicates(savingsGoals, 'id', `${path}.savingsGoals`, collector);
  reportDuplicates(budgets, 'category', `${path}.budgets`, collector);

  const activeSet = new Set(categories.filter((item): item is string => typeof item === 'string'));
  const archivedSet = new Set(archivedCategories.filter((item): item is string => typeof item === 'string'));
  if (activeSet.size !== categories.length) {
    collector.error('duplicate_category', `${path}.categories contains duplicate names.`, `${path}.categories`);
  }
  if (archivedSet.size !== archivedCategories.length) {
    collector.error('duplicate_category', `${path}.archivedCategories contains duplicate names.`, `${path}.archivedCategories`);
  }
  for (const category of activeSet) {
    if (archivedSet.has(category)) {
      collector.error('category_state_conflict', `Category "${category}" is both active and archived.`, `${path}.archivedCategories`);
    }
  }

  const recurringOccurrenceKeys = new Set<string>();
  transactions.forEach((item, index) => {
    if (!isRecord(item) || typeof item.sourceRecurringId !== 'string' || typeof item.sourceMonthKey !== 'string') return;
    const occurrenceKey = `${item.sourceRecurringId}\u0000${item.sourceMonthKey}`;
    if (recurringOccurrenceKeys.has(occurrenceKey)) {
      collector.error('duplicate_recurring_occurrence', 'The archive contains duplicate recurring occurrences.', `${path}.transactions[${index}]`);
    }
    recurringOccurrenceKeys.add(occurrenceKey);
  });

  return input as AppData;
}

function validatePortablePreferencesInto(input: unknown, path: string, collector: IssueCollector): AuraPortablePreferences | null {
  const record = requireRecord(input, path, collector);
  if (!record) return null;
  checkKeys(record, ['notificationPreferences', 'customReminders', 'appearance'], [], path, collector);
  validateNotificationPreferences(record.notificationPreferences, `${path}.notificationPreferences`, collector);
  const reminders = arrayField(record, 'customReminders', path, collector);
  reminders.forEach((item, index) => validateCustomReminder(item, `${path}.customReminders[${index}]`, collector));
  reportDuplicates(reminders, 'id', `${path}.customReminders`, collector);

  const appearance = requireRecord(record.appearance, `${path}.appearance`, collector);
  if (appearance) {
    checkKeys(appearance, ['darkMode'], [], `${path}.appearance`, collector);
    booleanField(appearance, 'darkMode', `${path}.appearance`, collector);
  }
  return input as AuraPortablePreferences;
}

function validateAttachmentInto(input: unknown, path: string, collector: IssueCollector): AuraArchiveAttachment | null {
  const record = requireRecord(input, path, collector);
  if (!record) return null;
  checkKeys(record, ['transactionId', 'mediaType', 'byteLength', 'dataUrl'], [], path, collector);
  const transactionId = stringField(record, 'transactionId', path, collector, { maxLength: 256 });
  const mediaType = stringField(record, 'mediaType', path, collector, { maxLength: 256 });
  const byteLength = numberField(record, 'byteLength', path, collector, { min: 0, integer: true });
  const dataUrl = stringField(record, 'dataUrl', path, collector, {
    maxLength: Math.ceil(AURA_ARCHIVE_LIMITS.maxAttachmentBytes * 4 / 3) + 512,
  });

  if (dataUrl !== undefined) {
    const parsed = parseAttachmentDataUrl(dataUrl);
    if (!parsed) {
      collector.error('invalid_attachment_data', `${path}.dataUrl must be a valid base64 data URL.`, `${path}.dataUrl`);
    } else {
      if (parsed.byteLength > AURA_ARCHIVE_LIMITS.maxAttachmentBytes) {
        collector.error('attachment_too_large', `${path} exceeds the V1 attachment limit.`, path);
      }
      if (mediaType !== undefined && parsed.mediaType !== mediaType) {
        collector.error('attachment_media_type_mismatch', `${path}.mediaType does not match its data URL.`, `${path}.mediaType`);
      }
      if (byteLength !== undefined && parsed.byteLength !== byteLength) {
        collector.error('attachment_length_mismatch', `${path}.byteLength does not match its data URL.`, `${path}.byteLength`);
      }
    }
  }
  if (!transactionId) return null;
  return input as AuraArchiveAttachment;
}

function validateCountsInto(input: unknown, path: string, collector: IssueCollector): AuraArchiveCounts | null {
  const record = requireRecord(input, path, collector);
  if (!record) return null;
  const keys: (keyof AuraArchiveCounts)[] = [
    'transactions', 'budgets', 'recurring', 'accounts', 'categories',
    'archivedCategories', 'savingsGoals', 'customReminders', 'attachments',
  ];
  checkKeys(record, keys, [], path, collector);
  keys.forEach((key) => numberField(record, key, path, collector, { min: 0, integer: true }));
  return input as AuraArchiveCounts;
}

function validateChecksums(input: unknown, path: string, collector: IssueCollector): void {
  const record = requireRecord(input, path, collector);
  if (!record) return;
  checkKeys(record, ['dataSha256', 'preferencesSha256', 'attachments'], [], path, collector);
  const dataChecksum = stringField(record, 'dataSha256', path, collector);
  const preferencesChecksum = stringField(record, 'preferencesSha256', path, collector);
  if (dataChecksum && !SHA256_PATTERN.test(dataChecksum)) {
    collector.error('invalid_checksum', `${path}.dataSha256 must be a SHA-256 hex digest.`, `${path}.dataSha256`);
  }
  if (preferencesChecksum && !SHA256_PATTERN.test(preferencesChecksum)) {
    collector.error('invalid_checksum', `${path}.preferencesSha256 must be a SHA-256 hex digest.`, `${path}.preferencesSha256`);
  }
  const attachments = requireRecord(record.attachments, `${path}.attachments`, collector);
  if (attachments) {
    for (const [transactionId, checksum] of Object.entries(attachments)) {
      if (!transactionId || typeof checksum !== 'string' || !SHA256_PATTERN.test(checksum)) {
        collector.error('invalid_checksum', `${path}.attachments contains an invalid checksum.`, `${path}.attachments.${transactionId}`);
      }
    }
  }
}

function validateManifestInto(input: unknown, path: string, collector: IssueCollector): AuraArchiveManifestV1 | null {
  const record = requireRecord(input, path, collector);
  if (!record) return null;
  checkKeys(record,
    ['archiveFormat', 'formatVersion', 'schemaVersion', 'createdAt', 'sourceAppVersion', 'sourceBuildSha', 'archiveId', 'counts', 'checksums'],
    [], path, collector);
  if (record.archiveFormat !== AURA_ARCHIVE_FORMAT) {
    collector.error('invalid_archive_format', 'The archive format identifier is invalid.', `${path}.archiveFormat`);
  }
  if (record.formatVersion !== AURA_ARCHIVE_FORMAT_VERSION) {
    if (Number.isInteger(record.formatVersion)) {
      throw new UnsupportedArchiveVersionError('format', record.formatVersion as number);
    }
    collector.error('invalid_format_version', 'The archive format version is invalid.', `${path}.formatVersion`);
  }
  if (record.schemaVersion !== AURA_ARCHIVE_SCHEMA_VERSION) {
    if (Number.isInteger(record.schemaVersion)) {
      throw new UnsupportedArchiveVersionError('schema', record.schemaVersion as number);
    }
    collector.error('invalid_schema_version', 'The archive schema version is invalid.', `${path}.schemaVersion`);
  }
  dateField(record, 'createdAt', path, collector);
  stringField(record, 'sourceAppVersion', path, collector, { maxLength: 128 });
  stringField(record, 'sourceBuildSha', path, collector, { maxLength: 128 });
  stringField(record, 'archiveId', path, collector, { maxLength: 256 });
  validateCountsInto(record.counts, `${path}.counts`, collector);
  validateChecksums(record.checksums, `${path}.checksums`, collector);
  return input as AuraArchiveManifestV1;
}

function checkExpectedCounts(
  manifest: AuraArchiveManifestV1,
  data: AppData,
  preferences: AuraPortablePreferences,
  attachments: AuraArchiveAttachment[],
  collector: IssueCollector,
): void {
  const actual = buildArchiveCounts(data, preferences, attachments);
  for (const key of Object.keys(actual) as (keyof AuraArchiveCounts)[]) {
    if (manifest.counts[key] !== actual[key]) {
      collector.error('count_mismatch', `manifest.counts.${key} does not match the payload.`, `manifest.counts.${key}`);
    }
  }
}

function checkReferences(
  manifest: AuraArchiveManifestV1,
  data: AppData,
  attachments: AuraArchiveAttachment[],
  collector: IssueCollector,
): void {
  const transactionIds = new Set(data.transactions.map((transaction) => transaction.id));
  const recurringIds = new Set(data.recurring.map((item) => item.id));
  const categories = new Set([...data.categories, ...data.archivedCategories]);
  const attachmentIds = new Set<string>();

  attachments.forEach((attachment, index) => {
    if (attachmentIds.has(attachment.transactionId)) {
      collector.error('duplicate_attachment', `Attachment for transaction "${attachment.transactionId}" is duplicated.`, `attachments[${index}].transactionId`);
    }
    attachmentIds.add(attachment.transactionId);
    if (!transactionIds.has(attachment.transactionId)) {
      collector.error('orphan_attachment', `Attachment references unknown transaction "${attachment.transactionId}".`, `attachments[${index}].transactionId`);
    }
    if (!(attachment.transactionId in manifest.checksums.attachments)) {
      collector.error('missing_attachment_checksum', `Attachment checksum is missing for "${attachment.transactionId}".`, `manifest.checksums.attachments.${attachment.transactionId}`);
    }
  });

  for (const transactionId of Object.keys(manifest.checksums.attachments)) {
    if (!attachmentIds.has(transactionId)) {
      collector.error('orphan_attachment_checksum', `Checksum references missing attachment "${transactionId}".`, `manifest.checksums.attachments.${transactionId}`);
    }
  }

  data.transactions.forEach((transaction, index) => {
    if (transaction.attachmentUrl && !attachmentIds.has(transaction.id)) {
      collector.warning('missing_attachment', `Transaction "${transaction.id}" references an unavailable attachment.`, `data.transactions[${index}].attachmentUrl`);
    }
    if (transaction.sourceRecurringId && !recurringIds.has(transaction.sourceRecurringId)) {
      collector.warning('missing_recurring_source', `Transaction "${transaction.id}" references an unavailable recurring item.`, `data.transactions[${index}].sourceRecurringId`);
    }
    if (!categories.has(transaction.category)) {
      collector.warning('unknown_category_reference', `Transaction "${transaction.id}" uses an unknown category.`, `data.transactions[${index}].category`);
    }
  });
  data.budgets.forEach((budget, index) => {
    if (!categories.has(budget.category)) {
      collector.warning('unknown_category_reference', `Budget uses unknown category "${budget.category}".`, `data.budgets[${index}].category`);
    }
  });
  data.recurring.forEach((item, index) => {
    if (!categories.has(item.category)) {
      collector.warning('unknown_category_reference', `Recurring item "${item.id}" uses an unknown category.`, `data.recurring[${index}].category`);
    }
  });
}

export function buildArchiveCounts(
  data: AppData,
  preferences: AuraPortablePreferences,
  attachments: AuraArchiveAttachment[],
): AuraArchiveCounts {
  return {
    transactions: data.transactions.length,
    budgets: data.budgets.length,
    recurring: data.recurring.length,
    accounts: data.accounts.length,
    categories: data.categories.length,
    archivedCategories: data.archivedCategories.length,
    savingsGoals: data.savingsGoals.length,
    customReminders: preferences.customReminders.length,
    attachments: attachments.length,
  };
}

export function validateAppData(input: unknown): ArchiveValidationResult<AppData> {
  const collector = new IssueCollector();
  const value = validateAppDataInto(input, 'data', collector);
  collector.throwIfErrors();
  return { value: value as AppData, warnings: collector.warnings() };
}

export function validatePortablePreferences(input: unknown): ArchiveValidationResult<AuraPortablePreferences> {
  const collector = new IssueCollector();
  const value = validatePortablePreferencesInto(input, 'preferences', collector);
  collector.throwIfErrors();
  return { value: value as AuraPortablePreferences, warnings: collector.warnings() };
}

export function validateArchivePayload(input: unknown): ArchiveValidationResult<AuraArchivePayloadV1> {
  const collector = new IssueCollector();
  const record = requireRecord(input, 'archive', collector);
  if (!record) {
    collector.throwIfErrors();
    throw new ArchiveValidationError(collector.issues);
  }
  checkKeys(record, ['manifest', 'data', 'preferences', 'attachments'], [], 'archive', collector);

  const manifest = validateManifestInto(record.manifest, 'manifest', collector);
  const data = validateAppDataInto(record.data, 'data', collector);
  const preferences = validatePortablePreferencesInto(record.preferences, 'preferences', collector);
  const rawAttachments = arrayField(record, 'attachments', 'archive', collector);
  if (rawAttachments.length > AURA_ARCHIVE_LIMITS.maxAttachmentCount) {
    collector.error('too_many_attachments', 'The archive contains too many attachments.', 'attachments');
  }
  const attachments = rawAttachments
    .map((attachment, index) => validateAttachmentInto(attachment, `attachments[${index}]`, collector))
    .filter((attachment): attachment is AuraArchiveAttachment => attachment !== null);

  collector.throwIfErrors();
  checkExpectedCounts(manifest as AuraArchiveManifestV1, data as AppData, preferences as AuraPortablePreferences, attachments, collector);
  checkReferences(manifest as AuraArchiveManifestV1, data as AppData, attachments, collector);
  collector.throwIfErrors();

  return {
    value: input as AuraArchivePayloadV1,
    warnings: collector.warnings(),
  };
}

export function migrateAndValidateArchivePayload(input: unknown): ArchiveValidationResult<AuraArchivePayloadV1> {
  return validateArchivePayload(migrateArchivePayload(input));
}

export function migrateValidateAndNormalizeArchivePayload(input: unknown): {
  payload: AuraArchivePayloadV1;
  normalizedData: AppData;
  warnings: ArchiveIssue[];
} {
  const validated = migrateAndValidateArchivePayload(input);
  return {
    payload: validated.value,
    normalizedData: normalizeAppData(validated.value.data),
    warnings: validated.warnings,
  };
}

export function validateArchiveHeader(input: unknown): ArchiveValidationResult<AuraArchiveHeaderV1> {
  const collector = new IssueCollector();
  const record = requireRecord(input, 'header', collector);
  if (!record) {
    collector.throwIfErrors();
    throw new ArchiveValidationError(collector.issues);
  }
  checkKeys(record,
    ['archiveFormat', 'formatVersion', 'mediaType', 'payloadByteLength', 'encryption'],
    ['payloadSha256'], 'header', collector);
  if (record.archiveFormat !== AURA_ARCHIVE_FORMAT) {
    collector.error('invalid_archive_format', 'The archive format identifier is invalid.', 'header.archiveFormat');
  }
  if (record.formatVersion !== AURA_ARCHIVE_FORMAT_VERSION) {
    if (Number.isInteger(record.formatVersion)) {
      throw new UnsupportedArchiveVersionError('format', record.formatVersion as number);
    }
    collector.error('invalid_format_version', 'The archive format version is invalid.', 'header.formatVersion');
  }
  if (record.mediaType !== AURA_ARCHIVE_MEDIA_TYPE) {
    collector.error('invalid_media_type', 'The archive media type is invalid.', 'header.mediaType');
  }
  numberField(record, 'payloadByteLength', 'header', collector, { min: 0, integer: true });
  if (typeof record.payloadByteLength === 'number' && record.payloadByteLength > AURA_ARCHIVE_LIMITS.maxPayloadBytes) {
    collector.error('payload_too_large', 'The archive payload exceeds the V1 size limit.', 'header.payloadByteLength');
  }

  const encryption = requireRecord(record.encryption, 'header.encryption', collector);
  if (encryption) {
    if (encryption.mode === 'none') {
      checkKeys(encryption, ['mode'], [], 'header.encryption', collector);
      if (typeof record.payloadSha256 !== 'string' || !SHA256_PATTERN.test(record.payloadSha256)) {
        collector.error('invalid_checksum', 'Plaintext archives require a valid payload checksum.', 'header.payloadSha256');
      }
    } else if (encryption.mode === 'passphrase') {
      checkKeys(encryption,
        ['mode', 'algorithm', 'keyLengthBits', 'authenticationTagBits', 'kdf', 'kdfHash', 'kdfIterations', 'saltBase64', 'ivBase64'],
        [], 'header.encryption', collector);
      if ('payloadSha256' in record) {
        collector.error('unexpected_checksum', 'Encrypted archives must not expose a plaintext payload checksum.', 'header.payloadSha256');
      }
      if (encryption.algorithm !== AURA_ARCHIVE_CRYPTO.algorithm) collector.error('unsupported_crypto', 'Unsupported encryption algorithm.', 'header.encryption.algorithm');
      if (encryption.keyLengthBits !== AURA_ARCHIVE_CRYPTO.keyLengthBits) collector.error('unsupported_crypto', 'Unsupported encryption key length.', 'header.encryption.keyLengthBits');
      if (encryption.authenticationTagBits !== AURA_ARCHIVE_CRYPTO.authenticationTagBits) collector.error('unsupported_crypto', 'Unsupported authentication tag length.', 'header.encryption.authenticationTagBits');
      if (encryption.kdf !== AURA_ARCHIVE_CRYPTO.kdf) collector.error('unsupported_crypto', 'Unsupported key-derivation function.', 'header.encryption.kdf');
      if (encryption.kdfHash !== AURA_ARCHIVE_CRYPTO.kdfHash) collector.error('unsupported_crypto', 'Unsupported key-derivation hash.', 'header.encryption.kdfHash');
      if (encryption.kdfIterations !== AURA_ARCHIVE_CRYPTO.kdfIterations) {
        collector.error('unsupported_crypto', 'The archive key-derivation work factor is unsupported by V1.', 'header.encryption.kdfIterations');
      }
      for (const key of ['saltBase64', 'ivBase64'] as const) {
        const value = encryption[key];
        const expectedBytes = key === 'saltBase64'
          ? AURA_ARCHIVE_CRYPTO.saltBytes
          : AURA_ARCHIVE_CRYPTO.ivBytes;
        if (typeof value !== 'string' || base64ByteLength(value) !== expectedBytes) {
          collector.error('invalid_crypto_metadata', `header.encryption.${key} is invalid.`, `header.encryption.${key}`);
        }
      }
    } else {
      collector.error('unsupported_encryption_mode', 'The archive encryption mode is unsupported.', 'header.encryption.mode');
    }
  }

  collector.throwIfErrors();
  return { value: input as AuraArchiveHeaderV1, warnings: [] };
}
