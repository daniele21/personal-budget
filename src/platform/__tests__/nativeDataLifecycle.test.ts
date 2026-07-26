import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  isPluginAvailable: vi.fn(),
  purge: vi.fn(),
  registerOwner: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
    isPluginAvailable: mocks.isPluginAvailable,
  },
  registerPlugin: () => ({
    purgeForLogoutOrReset: mocks.purge,
    registerOwner: mocks.registerOwner,
  }),
}));

import {
  purgeNativePaymentData,
  registerNativePaymentOwner,
} from '../nativeDataLifecycle';

describe('native data lifecycle coordination', () => {
  beforeEach(() => {
    mocks.isNativePlatform.mockReset();
    mocks.isPluginAvailable.mockReset();
    mocks.purge.mockReset();
    mocks.registerOwner.mockReset();
  });

  it('registers only the opaque Firebase UID input on the native boundary', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.isPluginAvailable.mockReturnValue(true);
    mocks.registerOwner.mockResolvedValue(undefined);

    await registerNativePaymentOwner('firebase-uid-1');

    expect(mocks.registerOwner).toHaveBeenCalledWith({
      firebaseUid: 'firebase-uid-1',
    });
  });

  it('is a no-op on web and before the payment plugin exists', async () => {
    mocks.isNativePlatform.mockReturnValue(false);
    await purgeNativePaymentData('logout');

    mocks.isNativePlatform.mockReturnValue(true);
    mocks.isPluginAvailable.mockReturnValue(false);
    await purgeNativePaymentData('local_reset');

    expect(mocks.purge).not.toHaveBeenCalled();
  });

  it('requires native purge completion before crossing an account boundary', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.isPluginAvailable.mockReturnValue(true);
    mocks.purge.mockResolvedValue(undefined);

    await purgeNativePaymentData('total_deletion');

    expect(mocks.purge).toHaveBeenCalledWith({
      reason: 'total_deletion',
    });
  });

  it('propagates purge failures so callers do not silently continue', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.isPluginAvailable.mockReturnValue(true);
    mocks.purge.mockRejectedValue(new Error('native purge failed'));

    await expect(purgeNativePaymentData('logout')).rejects.toThrow(
      'native purge failed',
    );
  });
});
