import type { PluginListenerHandle } from '@capacitor/core';
import { getPlatformCapabilities } from './platformCapabilities';
import {
  NativeAppRuntime,
  type NativeAppResumeEvent,
} from './nativeAppRuntime';

const ALLOWED_DEEP_LINK_ROUTES = new Set([
  '/',
  '/transactions',
  '/add',
  '/budgets',
  '/planning',
  '/planning/recurring',
  '/profile',
  '/settings',
  '/data',
  '/calendar',
  '/reports',
  '/reports/categories',
  '/reports/compare',
  '/reports/year',
  '/more',
]);

export interface AppRuntimeSubscription {
  remove(): Promise<void>;
}

type ResumeListener = (event: NativeAppResumeEvent) => void;

const resumeListeners = new Set<ResumeListener>();

export function parseAuraAppUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const allowedProtocol =
      url.protocol === 'com.staituned.aura:' ||
      url.protocol === 'com.staituned.aura.debug:';

    if (
      !allowedProtocol ||
      url.hostname !== 'open' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return null;
    }

    const path = url.pathname || '/';
    return ALLOWED_DEEP_LINK_ROUTES.has(path) ? path : null;
  } catch {
    return null;
  }
}

export function subscribeAppResumed(listener: ResumeListener): () => void {
  resumeListeners.add(listener);
  return () => resumeListeners.delete(listener);
}

function emitAppResumed(event: NativeAppResumeEvent): void {
  for (const listener of resumeListeners) listener(event);
}

export async function subscribeToAppRuntime(
  onAppUrl: (path: string) => void,
): Promise<AppRuntimeSubscription> {
  const capabilities = getPlatformCapabilities();

  if (!capabilities.isAndroid) {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        emitAppResumed({ sequence: Date.now() });
      }
    };
    window.addEventListener('pageshow', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return {
      remove: async () => {
        window.removeEventListener('pageshow', handleVisibility);
        document.removeEventListener('visibilitychange', handleVisibility);
      },
    };
  }

  const handles: PluginListenerHandle[] = [];
  const [urlHandle, resumeHandle] = await Promise.all([
    NativeAppRuntime.addListener('appUrlOpen', ({ url }) => {
      const path = parseAuraAppUrl(url);
      if (path) onAppUrl(path);
    }),
    NativeAppRuntime.addListener('appResumed', emitAppResumed),
  ]);
  handles.push(urlHandle, resumeHandle);

  const pending = await NativeAppRuntime.getPendingAppUrl();
  if (pending.url) {
    const path = parseAuraAppUrl(pending.url);
    if (path) onAppUrl(path);
  }

  return {
    remove: async () => {
      await Promise.all(handles.map((handle) => handle.remove()));
    },
  };
}

export async function acknowledgePendingAppUrl(): Promise<void> {
  if (!getPlatformCapabilities().isAndroid) return;
  await NativeAppRuntime.clearPendingAppUrl();
}
