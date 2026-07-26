import { beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ value: 'web' }));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platform.value,
  },
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

  it('preserves browser notification permission behavior on the web', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    vi.stubGlobal('Notification', Object.assign(vi.fn(), {
      permission: 'default' as NotificationPermission,
      requestPermission,
    }));

    expect(getLocalNotificationPermission()).toBe('default');
    await expect(requestLocalNotificationPermission()).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledOnce();
  });

  it('does not invoke browser notification APIs in the Android WebView', async () => {
    platform.value = 'android';
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    const notification = Object.assign(vi.fn(), {
      permission: 'granted' as NotificationPermission,
      requestPermission,
    });
    vi.stubGlobal('Notification', notification);

    expect(getLocalNotificationPermission()).toBe('denied');
    await expect(requestLocalNotificationPermission()).resolves.toBe('denied');
    await deliverLocalNotification({
      id: 'notification-1',
      title: 'Budget update',
      body: 'Review your budget',
    });

    expect(requestPermission).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });
});
