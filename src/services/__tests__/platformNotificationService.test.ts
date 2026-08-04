import { beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ value: 'web' }));
const native = vi.hoisted(() => ({
  requestPermission: vi.fn(async () => ({ granted: true })),
  deliver: vi.fn(async () => ({ delivered: true })),
  cancel: vi.fn(),
  cancelAll: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platform.value,
  },
  registerPlugin: () => native,
}));

import {
  deliverLocalNotification,
  getLocalNotificationPermission,
  requestLocalNotificationPermission,
} from '../platformNotificationService';

describe('platform notification service', () => {
  beforeEach(() => {
    platform.value = 'web';
  });

  it('keeps notification delivery disabled in the browser test harness', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    vi.stubGlobal('Notification', Object.assign(vi.fn(), {
      permission: 'default' as NotificationPermission,
      requestPermission,
    }));

    expect(getLocalNotificationPermission()).toBe('denied');
    await expect(requestLocalNotificationPermission()).resolves.toBe('denied');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not invoke browser notification APIs in the Android WebView', async () => {
    platform.value = 'android';
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    const notification = Object.assign(vi.fn(), {
      permission: 'granted' as NotificationPermission,
      requestPermission,
    });
    vi.stubGlobal('Notification', notification);

    expect(getLocalNotificationPermission()).toBe('default');
    await expect(requestLocalNotificationPermission()).resolves.toBe('granted');
    await deliverLocalNotification({
      id: 'notification-1',
      title: 'Budget update',
      body: 'Review your budget',
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
    expect(native.requestPermission).toHaveBeenCalledOnce();
    expect(native.deliver).toHaveBeenCalledWith(expect.objectContaining({
      id: 'notification-1',
      title: 'Budget update',
    }));
  });
});
