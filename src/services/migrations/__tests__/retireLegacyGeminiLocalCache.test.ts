import { describe, expect, it } from 'vitest';
import {
  LEGACY_GEMINI_IMPORT_CACHE_PREFIX,
  retireLegacyGeminiLocalCache,
} from '../retireLegacyGeminiLocalCache';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('retireLegacyGeminiLocalCache', () => {

  it('removes every entry in the exact retired namespace and preserves unrelated data', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${LEGACY_GEMINI_IMPORT_CACHE_PREFIX}first-hash`, 'cached');
    storage.setItem(`${LEGACY_GEMINI_IMPORT_CACHE_PREFIX}second-hash`, 'cached');
    storage.setItem('aura_transactions', '[]');
    storage.setItem('gemini_import_cache_v5_legacy', 'older-unrelated-namespace');

    expect(retireLegacyGeminiLocalCache(storage)).toBe(2);
    expect(storage.getItem('aura_transactions')).toBe('[]');
    expect(storage.getItem('gemini_import_cache_v5_legacy')).toBe('older-unrelated-namespace');
    expect(storage.getItem(`${LEGACY_GEMINI_IMPORT_CACHE_PREFIX}first-hash`)).toBeNull();
  });

  it('fails closed without interrupting startup when storage is unavailable', () => {
    const inaccessible = {
      get length(): number { throw new DOMException('blocked', 'SecurityError'); },
      key: () => null,
      removeItem: () => undefined,
    } as unknown as Storage;
    expect(retireLegacyGeminiLocalCache(inaccessible)).toBe(0);
  });
});
