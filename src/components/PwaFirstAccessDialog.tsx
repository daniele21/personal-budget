import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Download, LoaderCircle, Share, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import { STORAGE_KEYS } from '../data/storageKeys';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  getPwaInstallServerSnapshot,
  getPwaInstallSnapshot,
  getPwaManualInstallMode,
  isPwaInstallSupported,
  isPwaStandalone,
  promptPwaInstall,
  subscribePwaInstall,
} from '../services/pwaInstallService';
import { haptics } from '../utils/haptics';

interface PwaFirstAccessDialogProps {
  isEligible: boolean;
}

function wasAlreadyShown(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEYS.pwaInstallDialogShown) === 'true';
}

export function PwaFirstAccessDialog({ isEligible }: PwaFirstAccessDialogProps) {
  const isSupported = isPwaInstallSupported();
  const [dismissed, setDismissed] = useState(wasAlreadyShown);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const manualInstallMode = useMemo(getPwaManualInstallMode, []);
  const installState = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallSnapshot,
    getPwaInstallServerSnapshot,
  );
  const hasInstallPath = installState.canPrompt || manualInstallMode !== null;
  const isOpen = (
    isSupported &&
    isEligible &&
    !dismissed &&
    !installState.isInstalled &&
    !isPwaStandalone() &&
    hasInstallPath
  );

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEYS.pwaInstallDialogShown, 'true');
    setDismissed(true);
  };

  useFocusTrap(dialogRef, isOpen, dismiss);

  useEffect(() => {
    if (isOpen) {
      window.localStorage.setItem(STORAGE_KEYS.pwaInstallDialogShown, 'true');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const install = async () => {
    if (manualInstallMode !== null) {
      dismiss();
      return;
    }

    haptics.tap();
    setInstallError(false);
    setIsInstalling(true);
    const outcome = await promptPwaInstall();
    setIsInstalling(false);

    if (outcome === 'accepted' || outcome === 'dismissed') {
      dismiss();
    } else {
      setInstallError(true);
    }
  };

  const isIosOtherBrowser = manualInstallMode === 'ios-other';

  return (
    <div
      className="fixed inset-0 z-[170] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-first-access-title"
      aria-describedby="pwa-first-access-description"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm rounded-t-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md shadow-primary/20">
            {manualInstallMode ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </span>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Dismiss installation for now"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-micro font-bold text-primary">App on this device</p>
          <h2 id="pwa-first-access-title" className="mt-1 font-headline text-xl font-extrabold text-on-surface">
            Install Aura
          </h2>
          <p id="pwa-first-access-description" className="mt-2 text-sm leading-6 text-on-surface-variant">
            Open Aura from your Home Screen and use it like an app, without downloading a separate file or APK.
          </p>
        </div>

        {manualInstallMode && (
          <div className="mt-4 rounded-2xl bg-surface-container-low p-4">
            {isIosOtherBrowser && (
              <p className="mb-2 text-xs font-bold text-on-surface">
                Open this page in Safari first.
              </p>
            )}
            <ol className="space-y-1.5 text-xs font-medium leading-5 text-on-surface-variant">
              <li>1. Tap Share in Safari.</li>
              <li>2. Select Add to Home Screen.</li>
              <li>3. Enable Open as Web App, then tap Add.</li>
            </ol>
          </div>
        )}

        {!manualInstallMode && (
          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-on-surface-variant">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>Your browser will open its native installation confirmation.</p>
          </div>
        )}

        {installError && (
          <p className="mt-3 text-xs font-medium leading-5 text-error" role="alert">
            The browser did not open the installer. You can try again from the More page.
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="min-h-12 flex-1 rounded-2xl bg-surface-container-high px-4 text-sm font-bold text-on-surface-variant transition-all hover:bg-surface-container-highest active:scale-[0.98]"
          >
            Not now
          </button>
          <button
            type="button"
            data-autofocus="true"
            onClick={install}
            disabled={isInstalling}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {isInstalling
              ? <LoaderCircle className="h-4 w-4 animate-spin" />
              : manualInstallMode
                ? <Share className="h-4 w-4" />
                : <Download className="h-4 w-4" />}
            {isInstalling ? 'Opening…' : manualInstallMode ? 'Got it' : 'Install app'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
