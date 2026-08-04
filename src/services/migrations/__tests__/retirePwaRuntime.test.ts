import { afterEach, describe, expect, it, vi } from 'vitest';
import { retirePwaRuntime } from '../retirePwaRuntime';

describe('retirePwaRuntime', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('unregisters legacy service workers and deletes only Aura PWA caches', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }]) },
    });
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['aura-finance-v11', 'unrelated-cache']),
      delete: deleteCache,
    });

    await retirePwaRuntime();

    expect(unregister).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledWith('aura-finance-v11');
  });

  it('does not fail startup when retirement APIs reject', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistrations: vi.fn().mockRejectedValue(new Error('blocked')) },
    });

    await expect(retirePwaRuntime()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});
