import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Check, Download, ExternalLink, LoaderCircle, Share, X } from 'lucide-react';
import { haptics } from '../utils/haptics';
import {
  getPwaManualInstallMode,
  getPwaInstallServerSnapshot,
  getPwaInstallSnapshot,
  isPwaInstallSupported,
  isPwaStandalone,
  promptPwaInstall,
  subscribePwaInstall,
} from '../services/pwaInstallService';

interface PwaInstallButtonProps {
  variant?: 'row' | 'icon';
}

export function PwaInstallButton({ variant = 'row' }: PwaInstallButtonProps) {
  const isSupported = isPwaInstallSupported();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const manualInstallMode = useMemo(getPwaManualInstallMode, []);
  const isIos = manualInstallMode !== null;
  const isIosChromium = manualInstallMode === 'ios-other';
  const isIcon = variant === 'icon';
  const installState = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallSnapshot,
    getPwaInstallServerSnapshot,
  );

  useEffect(() => {
    if (!isPanelOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };

    window.addEventListener('pointerdown', closeOnOutsideClick);

    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [isPanelOpen]);

  const shouldShow = (
    isSupported &&
    !installState.isInstalled &&
    !isPwaStandalone() &&
    (isIcon || installState.canPrompt || isIos || isPanelOpen)
  );

  if (!shouldShow) return null;

  const install = async () => {
    haptics.tap();
    setInstallMessage(null);

    if (isIos) {
      setIsPanelOpen(true);
      return;
    }

    setIsInstalling(true);
    const outcome = await promptPwaInstall();
    setIsInstalling(false);

    if (outcome === 'dismissed') {
      setInstallMessage('Installation cancelled. You can try again when the browser offers installation again.');
      setIsPanelOpen(true);
    } else if (outcome === 'unavailable' || outcome === 'error') {
      setInstallMessage('The native install prompt is not available. Use your browser menu and choose Install app.');
      setIsPanelOpen(true);
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={install}
        disabled={isInstalling}
        className={isIcon
          ? 'flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-60'
          : 'flex min-h-14 w-full items-center gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 text-left text-primary transition-colors hover:bg-surface-container-low'}
        aria-label={isIcon ? 'Install Aura' : 'Install Aura Finance as app'}
        aria-expanded={isPanelOpen}
        title={isIcon ? 'Install Aura on this device' : undefined}
      >
        {isIcon ? (
          isInstalling
            ? <LoaderCircle className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />
        ) : (
          <>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              {isInstalling
                ? <LoaderCircle className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
            </span>
            <span>
              <span className="block text-sm font-bold text-on-surface">
                {isInstalling ? 'Opening installer…' : 'Install Aura'}
              </span>
              <span className="block text-xs text-on-surface-variant">
                {isIos ? 'Add Aura to your Home Screen' : 'Install the app on this device'}
              </span>
            </span>
          </>
        )}
      </button>

      {isPanelOpen && (
        <div
          className="fixed inset-0 z-[210] flex items-start justify-center bg-black/20 px-4 pt-20 backdrop-blur-[2px]"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setIsPanelOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-left shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
                {installMessage
                  ? <ExternalLink className="h-4 w-4" />
                  : isIos
                    ? <Share className="h-4 w-4" />
                    : <Check className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-headline font-extrabold text-on-surface">
                  {installMessage
                    ? 'Install from the browser'
                    : isIosChromium
                      ? 'Open in Safari to install'
                      : 'Install Aura on iPhone'}
                </p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                  {installMessage ??
                  (isIosChromium
                    ? 'Chrome on iPhone cannot open the PWA install dialog. Open this page in Safari, then add it to the Home Screen.'
                    : isIos
                      ? 'Safari installs Aura from its Share menu without downloading a separate file.'
                      : 'Use the install action in your browser menu.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
                aria-label="Close install help"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isIos && !installMessage && (
              <ol className="mt-3 space-y-1.5 rounded-xl bg-surface-container-low p-3 text-xs font-medium leading-5 text-on-surface-variant">
                <li>1. Open this page in Safari.</li>
                <li>2. Tap Share.</li>
                <li>3. Select Add to Home Screen.</li>
                <li>4. Enable Open as Web App, then tap Add.</li>
              </ol>
            )}
            {!isIos && installMessage && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-xs font-medium leading-5 text-on-surface-variant">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>Installation requires HTTPS, a valid manifest, and an active service worker.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
