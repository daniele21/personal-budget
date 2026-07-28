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
const PAYMENT_CANDIDATE_PATH = /^\/payment-candidates\/([A-Za-z0-9_-]{24})$/;

export type AppRuntimeTarget =
  | { kind: 'route'; path: string }
  | { kind: 'paymentCandidate'; candidateId: string };

export function parseAuraAppTarget(value: string): AppRuntimeTarget | null {
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
    if (ALLOWED_DEEP_LINK_ROUTES.has(path)) {
      return { kind: 'route', path };
    }
    const paymentCandidate = PAYMENT_CANDIDATE_PATH.exec(path);
    return paymentCandidate
      ? { kind: 'paymentCandidate', candidateId: paymentCandidate[1] }
      : null;
  } catch {
    return null;
  }
}

export function parseAuraAppUrl(value: string): string | null {
  const target = parseAuraAppTarget(value);
  return target?.kind === 'route' ? target.path : null;
}

export function subscribeAppResumed(listener: ResumeListener): () => void {
  resumeListeners.add(listener);
  return () => resumeListeners.delete(listener);
}

function emitAppResumed(event: NativeAppResumeEvent): void {
  for (const listener of resumeListeners) listener(event);
}

export async function subscribeToAppRuntime(
  onAppTarget: (target: AppRuntimeTarget) => void,
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
      const target = parseAuraAppTarget(url);
      if (target) {
        onAppTarget(target);
      } else {
        void NativeAppRuntime.clearPendingAppUrl().catch(() => undefined);
      }
    }),
    NativeAppRuntime.addListener('appResumed', emitAppResumed),
  ]);
  handles.push(urlHandle, resumeHandle);

  const pending = await NativeAppRuntime.getPendingAppUrl();
  if (pending.url) {
    const target = parseAuraAppTarget(pending.url);
    if (target) {
      onAppTarget(target);
    } else {
      await NativeAppRuntime.clearPendingAppUrl();
    }
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
