import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallButton } from '../PwaInstallButton';
import {
  initializePwaInstall,
  type BeforeInstallPromptEvent,
} from '../../services/pwaInstallService';

describe('PwaInstallButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a native install prompt captured before the lazy button mounts', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
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

    render(<PwaInstallButton variant="icon" />);

    const installButton = await screen.findByRole('button', {
      name: 'Installa Aura',
    });
    expect(screen.queryByText('Install Aura')).not.toBeInTheDocument();
    await userEvent.click(installButton);

    expect(prompt).toHaveBeenCalledOnce();
  });
});
