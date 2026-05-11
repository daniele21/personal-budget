import {
  RecurringExpense,
  RecurringFrequency,
  RecurringOverride,
  RecurringReminderSettings,
  Transaction,
  TransactionType,
} from '../types';

const DEFAULT_RECURRING_PAYMENT_METHOD = 'Bank Transfer';
const DEFAULT_RECURRING_REMINDER_LEAD_DAYS = 0;
const MAX_RECURRING_REMINDER_LEAD_DAYS = 30;
const RECURRING_FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

function ensureDate(value: string | undefined, fallback: Date = new Date()): Date {
  if (!value) return new Date(fallback);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(fallback);
  }

  return parsed;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

interface DateParts {
  year: number;
  monthIndex: number;
  day: number;
}

function getUtcDateParts(date: Date): DateParts {
  return {
    year: date.getUTCFullYear(),
    monthIndex: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}

function getLocalDateParts(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    day: date.getDate(),
  };
}

function compareDateParts(left: DateParts, right: DateParts): number {
  if (left.year !== right.year) return left.year - right.year;
  if (left.monthIndex !== right.monthIndex) return left.monthIndex - right.monthIndex;
  return left.day - right.day;
}

function addUtcDays(date: Date, days: number): Date {
  const nextDate = startOfUtcDay(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function clampReminderLeadDays(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_RECURRING_REMINDER_LEAD_DAYS;
  }

  return Math.min(
    Math.max(Math.round(value), DEFAULT_RECURRING_REMINDER_LEAD_DAYS),
    MAX_RECURRING_REMINDER_LEAD_DAYS,
  );
}

function isRecurringFrequency(value: unknown): value is RecurringFrequency {
  return RECURRING_FREQUENCIES.includes(value as RecurringFrequency);
}

function isDateWithinRange(date: Date, startDate: Date, endDate: Date): boolean {
  const dateParts = getUtcDateParts(date);
  return (
    compareDateParts(dateParts, getUtcDateParts(startDate)) >= 0 &&
    compareDateParts(dateParts, getUtcDateParts(endDate)) <= 0
  );
}

export function toIsoDate(date: Date): string {
  return startOfUtcDay(date).toISOString();
}

export function getDefaultRecurringEndDate(startDate: string): string {
  const start = ensureDate(startDate);
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return toIsoDate(end);
}

export function getRecurringDraftStartDate(
  year: number,
  monthIndex: number,
  preferredDay: number,
): string {
  const safeDay = Math.min(
    Math.max(preferredDay, 1),
    new Date(year, monthIndex + 1, 0).getDate(),
  );

  return [
    year,
    String(monthIndex + 1).padStart(2, '0'),
    String(safeDay).padStart(2, '0'),
  ].join('-');
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthKeyParts(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}

export function getRecurringFrequencyLabel(frequency: RecurringFrequency | undefined): string {
  switch (frequency) {
    case 'daily':
      return 'daily';
    case 'weekly':
      return 'weekly';
    case 'yearly':
      return 'yearly';
    case 'monthly':
    default:
      return 'monthly';
  }
}

export function getRecurringReminderSettings(
  recurring: RecurringExpense,
): RecurringReminderSettings {
  if (!recurring.reminder) {
    return { enabled: true, leadDays: DEFAULT_RECURRING_REMINDER_LEAD_DAYS };
  }

  return {
    enabled: recurring.reminder.enabled,
    leadDays: clampReminderLeadDays(recurring.reminder.leadDays),
  };
}

export function getRecurringReminderLabel(
  reminder: RecurringReminderSettings | undefined,
): string {
  if (!reminder?.enabled) return 'No reminder';
  if (reminder.leadDays === 0) return 'Due date reminder';
  if (reminder.leadDays === 1) return '1 day before';
  return `${reminder.leadDays} days before`;
}

export function getRecurringOccurrenceDate(
  recurring: RecurringExpense,
  year: number,
  monthIndex: number,
): Date {
  const day = Math.min(
    Math.max(recurring.dayOfMonth, 1),
    new Date(year, monthIndex + 1, 0).getDate(),
  );

  return new Date(Date.UTC(year, monthIndex, day));
}

export function getRecurringOccurrenceDateFromMonthKey(
  recurring: RecurringExpense,
  monthKey: string,
): Date {
  const { year, monthIndex } = getMonthKeyParts(monthKey);
  return getRecurringOccurrenceDate(recurring, year, monthIndex);
}

export function getRecurringOccurrenceKey(recurring: RecurringExpense, occurrenceDate: Date): string {
  if ((recurring.frequency ?? 'monthly') === 'monthly') {
    return `${occurrenceDate.getUTCFullYear()}-${String(occurrenceDate.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  return getUtcDateInputValue(occurrenceDate.toISOString());
}

export function getRecurringOverride(
  recurring: RecurringExpense,
  occurrenceKey: string,
): RecurringOverride | undefined {
  return recurring.overrides?.find((override) => (
    (override.occurrenceKey ?? override.monthKey) === occurrenceKey
  ));
}

export function upsertRecurringOverride(
  recurring: RecurringExpense,
  override: RecurringOverride,
): RecurringExpense {
  const overrides = recurring.overrides ?? [];
  const overrideKey = override.occurrenceKey ?? override.monthKey;
  const nextOverrides = overrides.some((entry) => (entry.occurrenceKey ?? entry.monthKey) === overrideKey)
    ? overrides.map((entry) => (
      (entry.occurrenceKey ?? entry.monthKey) === overrideKey ? { ...entry, ...override } : entry
    ))
    : [...overrides, override];

  return {
    ...recurring,
    overrides: nextOverrides.sort((a, b) => (
      (a.occurrenceKey ?? a.monthKey).localeCompare(b.occurrenceKey ?? b.monthKey)
    )),
  };
}

export function getRecurringOccurrencesInMonth(
  recurring: RecurringExpense,
  year: number,
  monthIndex: number,
): Date[] {
  const frequency = recurring.frequency ?? 'monthly';
  const startDate = startOfUtcDay(ensureDate(recurring.startDate));
  const endDate = startOfUtcDay(ensureDate(recurring.endDate));
  const occurrences: Date[] = [];
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  if (frequency === 'monthly') {
    const occurrenceDate = getRecurringOccurrenceDate(recurring, year, monthIndex);
    return isDateWithinRange(occurrenceDate, startDate, endDate) ? [occurrenceDate] : [];
  }

  if (frequency === 'yearly') {
    const startParts = getUtcDateParts(startDate);
    if (monthIndex !== startParts.monthIndex) return [];

    const day = Math.min(startParts.day, daysInMonth);
    const occurrenceDate = new Date(Date.UTC(year, monthIndex, day));
    return isDateWithinRange(occurrenceDate, startDate, endDate) ? [occurrenceDate] : [];
  }

  const startParts = getUtcDateParts(startDate);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const occurrenceDate = new Date(Date.UTC(year, monthIndex, day));
    if (!isDateWithinRange(occurrenceDate, startDate, endDate)) continue;

    if (frequency === 'daily' || occurrenceDate.getUTCDay() === startDate.getUTCDay()) {
      occurrences.push(occurrenceDate);
    }
  }

  return frequency === 'weekly'
    ? occurrences.filter((date) => compareDateParts(getUtcDateParts(date), startParts) >= 0)
    : occurrences;
}

export function isRecurringActiveInMonth(
  recurring: RecurringExpense,
  year: number,
  monthIndex: number,
): boolean {
  return getRecurringOccurrencesInMonth(recurring, year, monthIndex).length > 0;
}

export interface RecurringReminderCandidate {
  bill: RecurringExpense;
  occurrenceDate: Date;
  occurrenceKey: string;
  daysUntilDue: number;
}

export function getRecurringReminderCandidates(
  recurringItems: RecurringExpense[],
  today: Date = new Date(),
): RecurringReminderCandidate[] {
  const todayUtc = startOfUtcDay(new Date(Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )));

  return recurringItems.flatMap((bill) => {
    const reminder = getRecurringReminderSettings(bill);
    if (!reminder.enabled) return [];

    const windowEnd = addUtcDays(todayUtc, reminder.leadDays);
    const months = new Map<string, { year: number; monthIndex: number }>();
    let cursor = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1));
    const lastMonth = new Date(Date.UTC(windowEnd.getUTCFullYear(), windowEnd.getUTCMonth(), 1));

    while (compareDateParts(getUtcDateParts(cursor), getUtcDateParts(lastMonth)) <= 0) {
      months.set(`${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`, {
        year: cursor.getUTCFullYear(),
        monthIndex: cursor.getUTCMonth(),
      });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    return Array.from(months.values()).flatMap(({ year, monthIndex }) => (
      getRecurringOccurrencesInMonth(bill, year, monthIndex)
        .filter((occurrenceDate) => {
          const occurrenceParts = getUtcDateParts(occurrenceDate);
          return (
            compareDateParts(occurrenceParts, getUtcDateParts(todayUtc)) >= 0 &&
            compareDateParts(occurrenceParts, getUtcDateParts(windowEnd)) <= 0
          );
        })
        .map((occurrenceDate) => ({
          bill,
          occurrenceDate,
          occurrenceKey: getRecurringOccurrenceKey(bill, occurrenceDate),
          daysUntilDue: Math.round((occurrenceDate.getTime() - todayUtc.getTime()) / 86_400_000),
        }))
    ));
  });
}

export function normalizeRecurringExpense(recurring: RecurringExpense): RecurringExpense {
  const legacyStart = recurring.startDate ?? recurring.dueDate ?? new Date().toISOString();
  const startDate = toIsoDate(ensureDate(legacyStart));
  const endDate = toIsoDate(ensureDate(recurring.endDate ?? getDefaultRecurringEndDate(startDate)));
  const dayOfMonth = recurring.dayOfMonth ?? ensureDate(recurring.dueDate ?? recurring.startDate).getUTCDate();
  const type: TransactionType = recurring.type ?? (recurring.priority === false ? 'income' : 'expense');
  const frequency = isRecurringFrequency(recurring.frequency) ? recurring.frequency : 'monthly';
  const reminder = recurring.reminder
    ? {
      enabled: Boolean(recurring.reminder.enabled),
      leadDays: clampReminderLeadDays(recurring.reminder.leadDays),
    }
    : undefined;

  const overrides = (recurring.overrides ?? [])
    .filter((override) => typeof override.monthKey === 'string' && override.monthKey.length > 0)
    .map((override) => {
      const normalizedOverride: RecurringOverride = { ...override };

      if (override.date) {
        normalizedOverride.date = toIsoDate(ensureDate(override.date));
      }

      return normalizedOverride;
    })
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  return {
    ...recurring,
    startDate,
    endDate,
    dayOfMonth: Math.min(Math.max(dayOfMonth, 1), 31),
    type,
    frequency,
    priority: recurring.priority ?? type === 'expense',
    reminder,
    overrides,
  };
}

export function normalizeRecurringExpenses(recurring: RecurringExpense[]): RecurringExpense[] {
  return recurring.map(normalizeRecurringExpense);
}

export function buildRecurringTransaction(
  recurring: RecurringExpense,
  occurrenceKey: string,
  occurrenceDate: Date,
): Transaction | null {
  const override = getRecurringOverride(recurring, occurrenceKey);

  if (override?.skipped) {
    return null;
  }

  return {
    id: `rec_${recurring.id}_${occurrenceKey}_${Math.random().toString(36).slice(2, 6)}`,
    amount: override?.amount ?? recurring.amount,
    type: override?.type ?? recurring.type ?? 'expense',
    category: override?.category ?? recurring.category,
    date: override?.date ?? toIsoDate(occurrenceDate),
    title: override?.title ?? recurring.name,
    description: override?.description ?? `Auto-generated from recurring: ${recurring.name}`,
    paymentMethod: override?.paymentMethod ?? DEFAULT_RECURRING_PAYMENT_METHOD,
    sourceRecurringId: recurring.id,
    sourceMonthKey: occurrenceKey,
    recurringEdited: Boolean(override),
  };
}

export function reconcileRecurringTransactions(
  transactions: Transaction[],
  recurringItems: RecurringExpense[],
): Transaction[] {
  const recurringById = new Map(recurringItems.map((item) => [item.id, item]));
  const recurringByName = new Map<string, RecurringExpense[]>();

  recurringItems.forEach((item) => {
    const key = item.name.trim().toLowerCase();
    const matches = recurringByName.get(key) ?? [];
    matches.push(item);
    recurringByName.set(key, matches);
  });

  function getLegacyRecurringName(transaction: Transaction): string | null {
    const prefix = 'Auto-generated from recurring: ';
    if (!transaction.description?.startsWith(prefix)) return null;
    return transaction.description.slice(prefix.length).trim() || null;
  }

  function resolveRecurringForTransaction(transaction: Transaction): {
    recurring: RecurringExpense | null;
    occurrenceKey: string | null;
  } {
    if (transaction.sourceRecurringId && transaction.sourceMonthKey) {
      return {
        recurring: recurringById.get(transaction.sourceRecurringId) ?? null,
        occurrenceKey: transaction.sourceMonthKey,
      };
    }

    const legacyName = getLegacyRecurringName(transaction) ?? transaction.title?.trim() ?? '';
    if (!legacyName) {
      return { recurring: null, occurrenceKey: null };
    }

    const candidates = recurringByName.get(legacyName.toLowerCase()) ?? [];
    if (candidates.length !== 1) {
      return { recurring: null, occurrenceKey: null };
    }

    const matchedRecurring = candidates[0];
    const transactionDate = ensureDate(transaction.date);
    const occurrenceKey = getRecurringOccurrenceKey(matchedRecurring, transactionDate);
    return {
      recurring: matchedRecurring,
      occurrenceKey,
    };
  }

  return transactions.flatMap((transaction) => {
    const { recurring, occurrenceKey } = resolveRecurringForTransaction(transaction);
    if (!recurring || !occurrenceKey) {
      return [transaction];
    }

    const transactionDate = ensureDate(transaction.date);
    const { year, monthIndex } = occurrenceKey.length === 7
      ? getMonthKeyParts(occurrenceKey)
      : { year: transactionDate.getUTCFullYear(), monthIndex: transactionDate.getUTCMonth() };
    const occurrenceDate = getRecurringOccurrencesInMonth(recurring, year, monthIndex)
      .find((date) => getRecurringOccurrenceKey(recurring, date) === occurrenceKey);

    if (!occurrenceDate) {
      return [];
    }

    const expected = buildRecurringTransaction(recurring, occurrenceKey, occurrenceDate);
    if (!expected) {
      return [];
    }

    return [{
      ...transaction,
      sourceRecurringId: recurring.id,
      sourceMonthKey: occurrenceKey,
      amount: expected.amount,
      type: expected.type,
      category: expected.category,
      date: expected.date,
      title: expected.title,
      description: expected.description,
      paymentMethod: expected.paymentMethod,
      recurringEdited: expected.recurringEdited,
      reportingClass: undefined,
      reportingNote: undefined,
    }];
  });
}

export function getUtcDateInputValue(isoDate: string): string {
  return ensureDate(isoDate).toISOString().slice(0, 10);
}

export function getUtcDayOfMonth(isoDate: string): number {
  return ensureDate(isoDate).getUTCDate();
}

export function formatUtcDateLabel(isoDate: string, locale = 'default'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(ensureDate(isoDate));
}
