import { RecurringExpense, RecurringOverride, Transaction, TransactionType } from '../types';

const DEFAULT_RECURRING_PAYMENT_METHOD = 'Bank Transfer';

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

export function getRecurringOverride(
  recurring: RecurringExpense,
  monthKey: string,
): RecurringOverride | undefined {
  return recurring.overrides?.find((override) => override.monthKey === monthKey);
}

export function upsertRecurringOverride(
  recurring: RecurringExpense,
  override: RecurringOverride,
): RecurringExpense {
  const overrides = recurring.overrides ?? [];
  const nextOverrides = overrides.some((entry) => entry.monthKey === override.monthKey)
    ? overrides.map((entry) => (entry.monthKey === override.monthKey ? { ...entry, ...override } : entry))
    : [...overrides, override];

  return {
    ...recurring,
    overrides: nextOverrides.sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
  };
}

export function isRecurringActiveInMonth(
  recurring: RecurringExpense,
  year: number,
  monthIndex: number,
): boolean {
  const occurrenceDate = getUtcDateParts(getRecurringOccurrenceDate(recurring, year, monthIndex));
  const startDate = getUtcDateParts(ensureDate(recurring.startDate));
  const endDate = getUtcDateParts(ensureDate(recurring.endDate));

  return compareDateParts(occurrenceDate, startDate) >= 0 && compareDateParts(occurrenceDate, endDate) <= 0;
}

export function normalizeRecurringExpense(recurring: RecurringExpense): RecurringExpense {
  const legacyStart = recurring.startDate ?? recurring.dueDate ?? new Date().toISOString();
  const startDate = toIsoDate(ensureDate(legacyStart));
  const endDate = toIsoDate(ensureDate(recurring.endDate ?? getDefaultRecurringEndDate(startDate)));
  const dayOfMonth = recurring.dayOfMonth ?? ensureDate(recurring.dueDate ?? recurring.startDate).getUTCDate();
  const type: TransactionType = recurring.type ?? (recurring.priority === false ? 'income' : 'expense');

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
    frequency: 'monthly',
    priority: recurring.priority ?? type === 'expense',
    overrides,
  };
}

export function normalizeRecurringExpenses(recurring: RecurringExpense[]): RecurringExpense[] {
  return recurring.map(normalizeRecurringExpense);
}

export function buildRecurringTransaction(
  recurring: RecurringExpense,
  monthKey: string,
  occurrenceDate: Date,
): Transaction | null {
  const override = getRecurringOverride(recurring, monthKey);

  if (override?.skipped) {
    return null;
  }

  return {
    id: `rec_${recurring.id}_${monthKey}_${Math.random().toString(36).slice(2, 6)}`,
    amount: override?.amount ?? recurring.amount,
    type: override?.type ?? recurring.type ?? 'expense',
    category: override?.category ?? recurring.category,
    date: override?.date ?? toIsoDate(occurrenceDate),
    title: override?.title ?? recurring.name,
    description: override?.description ?? `Auto-generated from recurring: ${recurring.name}`,
    paymentMethod: override?.paymentMethod ?? DEFAULT_RECURRING_PAYMENT_METHOD,
    sourceRecurringId: recurring.id,
    sourceMonthKey: monthKey,
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
    monthKey: string | null;
  } {
    if (transaction.sourceRecurringId && transaction.sourceMonthKey) {
      return {
        recurring: recurringById.get(transaction.sourceRecurringId) ?? null,
        monthKey: transaction.sourceMonthKey,
      };
    }

    const legacyName = getLegacyRecurringName(transaction) ?? transaction.title?.trim() ?? '';
    if (!legacyName) {
      return { recurring: null, monthKey: null };
    }

    const candidates = recurringByName.get(legacyName.toLowerCase()) ?? [];
    if (candidates.length !== 1) {
      return { recurring: null, monthKey: null };
    }

    const monthKey = getUtcDateInputValue(transaction.date).slice(0, 7);
    return {
      recurring: candidates[0],
      monthKey,
    };
  }

  return transactions.flatMap((transaction) => {
    const { recurring, monthKey } = resolveRecurringForTransaction(transaction);
    if (!recurring || !monthKey) {
      return [transaction];
    }

    const { year, monthIndex } = getMonthKeyParts(monthKey);
    if (!isRecurringActiveInMonth(recurring, year, monthIndex)) {
      return [];
    }

    const occurrenceDate = getRecurringOccurrenceDate(recurring, year, monthIndex);
    const expected = buildRecurringTransaction(recurring, monthKey, occurrenceDate);
    if (!expected) {
      return [];
    }

    return [{
      ...transaction,
      sourceRecurringId: recurring.id,
      sourceMonthKey: monthKey,
      amount: expected.amount,
      type: expected.type,
      category: expected.category,
      date: expected.date,
      title: expected.title,
      description: expected.description,
      paymentMethod: expected.paymentMethod,
      recurringEdited: expected.recurringEdited,
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
