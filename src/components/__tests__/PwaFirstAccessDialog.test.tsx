import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../data/storageKeys';
import {
  initializePwaInstall,
  type BeforeInstallPromptEvent,
} from '../../services/pwaInstallService';
import { PwaFirstAccessDialog } from '../PwaFirstAccessDialog';

describe('PwaFirstAccessDialog', () => {
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
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  it('waits for onboarding, appears once, and invokes the captured native installer', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    initializePwaInstall();
    const installEvent = new Event('beforeinstallprompt', {
      cancelable: true,
    }) as BeforeInstallPromptEvent;
    installEvent.prompt = prompt;
    installEvent.userChoice = Promise.resolve({
      outcome: 'accepted',
      platform: 'web',
    });
    window.dispatchEvent(installEvent);

    const firstRender = render(<PwaFirstAccessDialog isEligible={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    firstRender.rerender(<PwaFirstAccessDialog isEligible />);
    expect(await screen.findByRole('dialog', { name: 'Install Aura' })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEYS.pwaInstallDialogShown)).toBe('true');

    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    firstRender.unmount();
    const rememberedRender = render(<PwaFirstAccessDialog isEligible />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rememberedRender.unmount();
    window.localStorage.removeItem(STORAGE_KEYS.pwaInstallDialogShown);
    render(<PwaFirstAccessDialog isEligible />);
    await userEvent.click(await screen.findByRole('button', { name: 'Install app' }));

    expect(prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
