import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../data/storageKeys';
import { TEST_PREFERENCES } from '../../domain/archive/__tests__/fixtures';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  portablePreferencesRepository,
} from '../portablePreferencesRepository';

const storedValues = new Map<string, string>();
const localStorageMock: Storage = {
  get length() { return storedValues.size; },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => { storedValues.delete(key); },
  setItem: (key, value) => { storedValues.set(key, String(value)); },
};

describe('portablePreferencesRepository', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });
  });

  beforeEach(() => window.localStorage.clear());

  it('loads portable defaults when no values are stored', () => {
    expect(portablePreferencesRepository.load()).toEqual({
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      customReminders: [],
      appearance: { darkMode: false },
    });
  });

  it('normalizes legacy partial notification preferences', () => {
    window.localStorage.setItem(STORAGE_KEYS.notificationPreferences, JSON.stringify({ enabled: true }));

    expect(portablePreferencesRepository.load().notificationPreferences).toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      enabled: true,
    });
  });

  it('round-trips supported preferences without touching session keys', () => {
    window.localStorage.setItem(STORAGE_KEYS.cloudBackupEnabled, 'true');
    portablePreferencesRepository.save(TEST_PREFERENCES);

    expect(portablePreferencesRepository.load()).toEqual(TEST_PREFERENCES);
    expect(window.localStorage.getItem(STORAGE_KEYS.cloudBackupEnabled)).toBe('true');
  });

  it('rejects malformed stored reminders instead of silently omitting user data', () => {
    window.localStorage.setItem(STORAGE_KEYS.customReminders, JSON.stringify([{ id: 'broken' }]));

    expect(() => portablePreferencesRepository.load()).toThrow();
  });
});
