import { STORAGE_KEYS } from '../data/storageKeys';
import {
  validatePortablePreferences,
  type AuraPortablePreferences,
} from '../domain/archive';
import type { CustomReminder, NotificationPreferences } from '../types';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  budgetAlerts: true,
  recurringReminders: true,
  customReminders: true,
  reminderLeadDays: 1,
};

function parseStoredJson(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Stored Aura preference "${key}" is not valid JSON.`);
  }
}

function normalizeNotificationPreferences(input: unknown): NotificationPreferences {
  if (input === undefined) return DEFAULT_NOTIFICATION_PREFERENCES;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Stored notification preferences are invalid.');
  }
  const candidate = input as Partial<NotificationPreferences>;
  return {
    enabled: candidate.enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.enabled,
    budgetAlerts: candidate.budgetAlerts ?? DEFAULT_NOTIFICATION_PREFERENCES.budgetAlerts,
    recurringReminders: candidate.recurringReminders ?? DEFAULT_NOTIFICATION_PREFERENCES.recurringReminders,
    customReminders: candidate.customReminders ?? DEFAULT_NOTIFICATION_PREFERENCES.customReminders,
    reminderLeadDays: candidate.reminderLeadDays ?? DEFAULT_NOTIFICATION_PREFERENCES.reminderLeadDays,
  };
}

function normalizeCustomReminders(input: unknown): CustomReminder[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new Error('Stored custom reminders are invalid.');
  return input as CustomReminder[];
}

function normalizeDarkMode(input: unknown): boolean {
  if (input === undefined) return false;
  if (typeof input !== 'boolean') throw new Error('Stored appearance preference is invalid.');
  return input;
}

export const portablePreferencesRepository = {
  load(): AuraPortablePreferences {
    const candidate: AuraPortablePreferences = {
      notificationPreferences: normalizeNotificationPreferences(
        parseStoredJson(STORAGE_KEYS.notificationPreferences),
      ),
      customReminders: normalizeCustomReminders(
        parseStoredJson(STORAGE_KEYS.customReminders),
      ),
      appearance: {
        darkMode: normalizeDarkMode(parseStoredJson(STORAGE_KEYS.darkMode)),
      },
    };

    return validatePortablePreferences(candidate).value;
  },

  save(preferences: AuraPortablePreferences): void {
    const validated = validatePortablePreferences(preferences).value;
    window.localStorage.setItem(
      STORAGE_KEYS.notificationPreferences,
      JSON.stringify(validated.notificationPreferences),
    );
    window.localStorage.setItem(
      STORAGE_KEYS.customReminders,
      JSON.stringify(validated.customReminders),
    );
    window.localStorage.setItem(
      STORAGE_KEYS.darkMode,
      JSON.stringify(validated.appearance.darkMode),
    );
  },
};
