import { getPlatformCapabilities } from '../platform/platformCapabilities';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaInstallSnapshot {
  canPrompt: boolean;
  isInstalled: boolean;
}

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'error';
export type PwaManualInstallMode = 'ios-safari' | 'ios-other' | null;

const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: PwaInstallSnapshot = {
  canPrompt: false,
  isInstalled: false,
};
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
let snapshot: PwaInstallSnapshot = {
  canPrompt: false,
  isInstalled: false,
};

export function isPwaStandalone(): boolean {
  if (!isPwaInstallSupported()) return false;
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function getPwaManualInstallMode(): PwaManualInstallMode {
  if (!isPwaInstallSupported()) return null;
  if (typeof navigator === 'undefined') return null;
  const isIos = (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  if (!isIos) return null;
  return /(crios|edgios|fxios)/i.test(navigator.userAgent) ? 'ios-other' : 'ios-safari';
}

function publish(next: PwaInstallSnapshot): void {
  if (
    next.canPrompt === snapshot.canPrompt &&
    next.isInstalled === snapshot.isInstalled
  ) {
    return;
  }
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/**
 * Start listening before lazy route components mount. Chromium commonly emits
 * beforeinstallprompt during initial page load, and the event cannot be
 * recreated later if a route-level button missed it.
 */
export function initializePwaInstall(): void {
  if (!isPwaInstallSupported()) return;
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  publish({ canPrompt: false, isInstalled: isPwaStandalone() });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    publish({ canPrompt: true, isInstalled: false });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    publish({ canPrompt: false, isInstalled: true });
  });
}

export function isPwaInstallSupported(): boolean {
  return getPlatformCapabilities().pwaInstallSupported;
}

export function subscribePwaInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPwaInstallSnapshot(): PwaInstallSnapshot {
  return snapshot;
}

export function getPwaInstallServerSnapshot(): PwaInstallSnapshot {
  return SERVER_SNAPSHOT;
}

export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return 'unavailable';

  // A deferred prompt is one-shot. Clear it immediately so two rapid clicks
  // cannot attempt to reuse the same browser event.
  deferredPrompt = null;
  publish({ canPrompt: false, isInstalled: false });

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      publish({ canPrompt: false, isInstalled: true });
    }
    return choice.outcome;
  } catch (error) {
    console.warn('[PWA] Native install prompt failed:', error);
    return 'error';
  }
}
