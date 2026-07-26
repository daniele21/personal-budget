import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
  },
}));

import { PwaFirstAccessDialog } from '../../components/PwaFirstAccessDialog';
import { PwaInstallButton } from '../../components/PwaInstallButton';
import {
  initializePwaInstall,
  isPwaInstallSupported,
} from '../../services/pwaInstallService';

describe('native PWA isolation', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const storage: Storage = {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => { values.delete(key); },
      setItem: (key, value) => { values.set(key, String(value)); },
    };

    vi.stubGlobal('localStorage', storage);
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
  });

  it('does not initialize browser install listeners on Android', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');

    initializePwaInstall();

    expect(isPwaInstallSupported()).toBe(false);
    expect(addEventListener).not.toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    );
    expect(addEventListener).not.toHaveBeenCalledWith(
      'appinstalled',
      expect.any(Function),
    );
  });

  it('does not render PWA installation entry points on Android', () => {
    render(
      <>
        <PwaInstallButton />
        <PwaFirstAccessDialog isEligible />
      </>,
    );

    expect(screen.queryByRole('button', { name: /install aura/i })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
