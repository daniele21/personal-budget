import { Capacitor } from '@capacitor/core';

export type AppRuntimePlatform = 'web' | 'android' | 'ios' | 'unknown';

export interface PlatformCapabilities {
  platform: AppRuntimePlatform;
  isNative: boolean;
  isAndroid: boolean;
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
    serviceWorkerSupported: false,
    browserNotificationsSupported: false,
    paymentDetectionSupported: platform === 'android',
  };
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = Capacitor.getPlatform();
  if (platform === 'web' || platform === 'android' || platform === 'ios') {
    return resolvePlatformCapabilities(platform);
  }
  return resolvePlatformCapabilities('unknown');
}
