import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, Share, X } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isIosChromiumBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /(crios|edgios)/i.test(navigator.userAgent);
}

function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function PwaInstallButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isIos = useMemo(isIosDevice, []);
  const isIosChromium = useMemo(isIosChromiumBrowser, []);

  useEffect(() => {
    if (!isMobileDevice() || isStandaloneApp()) return;

    setIsVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      setIsVisible(false);
      setIsPanelOpen(false);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [isIos]);

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

  if (!isVisible) return null;

  const install = async () => {
    haptics.tap();
    if (isIos || !installEvent) {
      setIsPanelOpen(true);
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setIsVisible(false);
      setIsPanelOpen(false);
    }
    setInstallEvent(null);
  };

  return (
    <div ref={panelRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={install}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 text-left text-primary transition-colors hover:bg-surface-container-low"
        aria-label="Install Aura Finance as app"
        aria-expanded={isPanelOpen}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Download className="h-4 w-4" /></span>
        <span><span className="block text-sm font-bold text-on-surface">Install Aura</span><span className="block text-xs text-on-surface-variant">Add the app to this device</span></span>
      </button>

      {isPanelOpen && (
        <div className="fixed inset-0 z-[210] flex items-start justify-center bg-black/20 px-4 pt-20 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-left shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
                {isIos ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-headline font-extrabold text-on-surface">
                  {isIosChromium ? 'Open in Safari to install' : 'Install Aura'}
                </p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                  {isIosChromium
                    ? 'Chrome on iPhone cannot open the PWA install dialog. Open this page in Safari, then add it to the Home Screen.'
                    : isIos
                      ? 'On iPhone, install from Safari with Share and Add to Home Screen.'
                      : 'Chrome will show the native install dialog when the PWA is installable on this device.'}
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
            {isIos && (
              <ol className="mt-3 space-y-1.5 rounded-xl bg-surface-container-low p-3 text-xs font-medium leading-5 text-on-surface-variant">
                <li>1. Open this page in Safari.</li>
                <li>2. Tap Share.</li>
                <li>3. Select Add to Home Screen.</li>
                <li>4. Confirm with Add.</li>
              </ol>
            )}
            {!isIos && !installEvent && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-xs font-medium leading-5 text-on-surface-variant">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>If Chrome does not open the dialog, reload the page and check that the site is served over HTTPS with a valid service worker.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
