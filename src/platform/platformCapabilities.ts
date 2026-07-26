import { Capacitor } from '@capacitor/core';

export type AppRuntimePlatform = 'web' | 'android' | 'ios' | 'unknown';

export interface PlatformCapabilities {
  platform: AppRuntimePlatform;
  isNative: boolean;
  isAndroid: boolean;
  pwaInstallSupported: boolean;
  serviceWorkerSupported: boolean;
  browserNotificationsSupported: boolean;
  paymentDetectionSupported: boolean;
}

export function resolvePlatformCapabilities(
  platform: AppRuntimePlatform,
): PlatformCapabilities {
  const isNative = platform !== 'web';

  return {
    platform,
    isNative,
    isAndroid: platform === 'android',
    pwaInstallSupported: platform === 'web',
    serviceWorkerSupported: platform === 'web',
    browserNotificationsSupported: platform === 'web',
    // This becomes true only when the native plugin contract is implemented
    // and available. Android alone is not enough to advertise the feature.
    paymentDetectionSupported: false,
  };
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = Capacitor.getPlatform();
  if (platform === 'web' || platform === 'android' || platform === 'ios') {
    return resolvePlatformCapabilities(platform);
  }
  return resolvePlatformCapabilities('unknown');
}
