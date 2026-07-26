import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativePlugin = vi.hoisted(() => ({
  getStatus: vi.fn(),
  listSupportedApps: vi.fn(),
  updateSettings: vi.fn(),
  openNotificationAccessSettings: vi.fn(),
  requestAuraNotificationPermission: vi.fn(),
}));

const capacitor = vi.hoisted(() => ({
  getPlatform: vi.fn(() => 'android'),
  isPluginAvailable: vi.fn(() => true),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: capacitor,
  registerPlugin: () => nativePlugin,
}));

import { paymentDetectionSettings } from '../paymentDetectionSettings';

describe('paymentDetectionSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capacitor.getPlatform.mockReturnValue('android');
    capacitor.isPluginAvailable.mockReturnValue(true);
  });

  it('passes requested and OS permission state through independently', async () => {
    nativePlugin.getStatus.mockResolvedValue({
      supported: true,
      requestedEnabled: true,
      osPermissionGranted: false,
      listenerConnected: false,
      auraNotificationPermissionGranted: false,
      selectedPackages: ['com.staituned.aura.syntheticnotifications'],
    });

    const status = await paymentDetectionSettings.getStatus();

    expect(status.requestedEnabled).toBe(true);
    expect(status.osPermissionGranted).toBe(false);
  });

  it('rejects use outside the Android plugin boundary', async () => {
    capacitor.getPlatform.mockReturnValue('web');

    await expect(paymentDetectionSettings.getStatus()).rejects.toThrow(
      'available only on Android',
    );
    expect(nativePlugin.getStatus).not.toHaveBeenCalled();
  });

  it('forwards only explicit package selection', async () => {
    nativePlugin.updateSettings.mockResolvedValue({
      requestedEnabled: true,
      osPermissionGranted: true,
      listenerConnected: true,
      auraNotificationPermissionGranted: true,
      selectedPackages: ['com.staituned.aura.syntheticnotifications'],
    });

    await paymentDetectionSettings.updateSettings({
      requestedEnabled: true,
      selectedPackages: ['com.staituned.aura.syntheticnotifications'],
    });

    expect(nativePlugin.updateSettings).toHaveBeenCalledWith({
      requestedEnabled: true,
      selectedPackages: ['com.staituned.aura.syntheticnotifications'],
    });
  });
});
