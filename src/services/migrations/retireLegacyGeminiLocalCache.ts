/**
 * Removes only the retired V6 import-cache namespace left by old clients.
 * The migration is deliberately best-effort and never touches other keys.
 */
export const LEGACY_GEMINI_IMPORT_CACHE_PREFIX = 'gemini_import_cache_v6_';

export function retireLegacyGeminiLocalCache(storage: Storage = window.localStorage): number {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(LEGACY_GEMINI_IMPORT_CACHE_PREFIX)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) storage.removeItem(key);
    return keysToRemove.length;
  } catch {
    return 0;
  }
}
