import { describe, expect, it } from 'vitest';
import { resolvePlatformCapabilities } from '../platformCapabilities';

describe('resolvePlatformCapabilities', () => {
  it('keeps retired PWA capabilities disabled in the browser harness', () => {
    expect(resolvePlatformCapabilities('web')).toEqual({
      platform: 'web',
      isNative: false,
      isAndroid: false,
      serviceWorkerSupported: false,
      browserNotificationsSupported: false,
      paymentDetectionSupported: false,
    });
  });

  it('does not initialize PWA behavior in the Android runtime', () => {
    expect(resolvePlatformCapabilities('android')).toEqual({
      platform: 'android',
      isNative: true,
      isAndroid: true,
      serviceWorkerSupported: false,
      browserNotificationsSupported: false,
      paymentDetectionSupported: true,
    });
  });

  it('does not imply payment detection support on an unsupported native platform', () => {
    const capabilities = resolvePlatformCapabilities('ios');

    expect(capabilities.isNative).toBe(true);
    expect(capabilities.isAndroid).toBe(false);
    expect(capabilities.paymentDetectionSupported).toBe(false);
  });

  it('fails closed for an unknown runtime', () => {
    const capabilities = resolvePlatformCapabilities('unknown');

    expect(capabilities.isNative).toBe(true);
    expect(capabilities.serviceWorkerSupported).toBe(false);
    expect(capabilities.paymentDetectionSupported).toBe(false);
  });
});
