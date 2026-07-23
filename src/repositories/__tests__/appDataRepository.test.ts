import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { appDataRepository } from '../appDataRepository';
import { STORAGE_KEYS } from '../../data/storageKeys';
import { INITIAL_APP_DATA } from '../../data/model';

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

  it('persists only canonical AppData fields when passed extended application state', () => {
    const extendedState = {
      ...INITIAL_APP_DATA,
      onboardingComplete: true,
      initialDataChoice: 'demo',
    };

    expect(() => {
      appDataRepository.saveAppDataStrict(extendedState);
    }).not.toThrow();

    expect(window.localStorage.getItem(STORAGE_KEYS.transactions)).toBe(JSON.stringify([]));
    expect(window.localStorage.getItem(STORAGE_KEYS.monthlyBudget)).toBe(
      JSON.stringify(INITIAL_APP_DATA.monthlyBudget),
    );
    expect(window.localStorage.getItem(STORAGE_KEYS.onboardingComplete)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.initialDataChoice)).toBeNull();
  });

  it('migrates legacy remote demo receipt URLs before strict persistence', () => {
    appDataRepository.saveAppDataStrict({
      ...INITIAL_APP_DATA,
      transactions: [{
        id: 'legacy-demo-receipt',
        amount: 25,
        type: 'expense',
        category: 'Shopping',
        date: '2026-04-10T00:00:00.000Z',
        title: 'Demo purchase',
        description: '',
        paymentMethod: 'Card',
        attachmentUrl: 'https://images.unsplash.com/photo-demo?auto=format&fit=crop&w=400',
      }],
    });

    const transactions = JSON.parse(
      window.localStorage.getItem(STORAGE_KEYS.transactions) ?? '[]',
    );
    expect(transactions[0]).not.toHaveProperty('attachmentUrl');
  });
});
