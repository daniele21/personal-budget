import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appDataRepository } from '../appDataRepository';
import { STORAGE_KEYS } from '../../data/storageKeys';

const storedValues = new Map<string, string>();
const localStorageMock: Storage = {
  get length() { return storedValues.size; },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => { storedValues.delete(key); },
  setItem: (key, value) => { storedValues.set(key, String(value)); },
};

describe('appDataRepository', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears only registered STORAGE_KEYS without wiping unrelated localStorage items', () => {
    // Setup Aura keys and non-Aura keys in localStorage
    window.localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify([]));
    window.localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(['Food']));
    window.localStorage.setItem('external_third_party_key', 'should_remain');

    expect(window.localStorage.getItem(STORAGE_KEYS.transactions)).not.toBeNull();
    expect(window.localStorage.getItem('external_third_party_key')).toBe('should_remain');

    appDataRepository.clear();

    // Aura keys should be removed
    expect(window.localStorage.getItem(STORAGE_KEYS.transactions)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.categories)).toBeNull();

    // External key should remain intact
    expect(window.localStorage.getItem('external_third_party_key')).toBe('should_remain');
  });
});
