const RETIRED_AURA_CACHE_PREFIXES = ['aura-finance-'];

/**
 * Removes the runtime left by previously installed Aura PWA releases.
 *
 * This is intentionally best-effort: startup must never depend on browser APIs
 * that are absent in the Android WebView or test harness.
 */
export async function retirePwaRuntime(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in globalThis) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => RETIRED_AURA_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
          .map((name) => caches.delete(name)),
      );
    }
  } catch (error) {
    // Retirement is a compatibility migration, not a startup prerequisite.
    console.warn('Unable to fully retire the legacy Aura PWA runtime.', error);
  }
}
