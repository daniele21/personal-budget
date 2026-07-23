import { describe, expect, it, vi } from 'vitest';
import {
  getPwaInstallSnapshot,
  initializePwaInstall,
  promptPwaInstall,
  type BeforeInstallPromptEvent,
} from '../pwaInstallService';

describe('pwaInstallService', () => {
  it('captures the one-shot browser event globally and installs on demand', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    const prompt = vi.fn().mockResolvedValue(undefined);
    initializePwaInstall();

    const event = new Event('beforeinstallprompt', {
      cancelable: true,
    }) as BeforeInstallPromptEvent;
    event.prompt = prompt;
    event.userChoice = Promise.resolve({
      outcome: 'accepted',
      platform: 'web',
    });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(getPwaInstallSnapshot()).toEqual({
      canPrompt: true,
      isInstalled: false,
    });

    await expect(promptPwaInstall()).resolves.toBe('accepted');
    expect(prompt).toHaveBeenCalledOnce();
    expect(getPwaInstallSnapshot()).toEqual({
      canPrompt: false,
      isInstalled: true,
    });
  });
});
