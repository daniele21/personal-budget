import { getPlatformCapabilities } from '../platform/platformCapabilities';
import { NativeLocalNotifications } from '../platform/nativeLocalNotifications';

export interface LocalNotificationPayload {
  id: string;
  title: string;
  body: string;
  route?: string;
  dedupeKey?: string;
}

export function getLocalNotificationPermission(): NotificationPermission {
  const capabilities = getPlatformCapabilities();
  if (capabilities.isAndroid) return 'default';
  if (
    !capabilities.browserNotificationsSupported ||
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestLocalNotificationPermission(): Promise<NotificationPermission> {
  const capabilities = getPlatformCapabilities();
  if (capabilities.isAndroid) {
    const result = await NativeLocalNotifications.requestPermission();
    return result.granted ? 'granted' : 'denied';
  }
  if (
    !capabilities.browserNotificationsSupported ||
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return 'denied';
  }
  return Notification.requestPermission();
}

export async function deliverLocalNotification(
  payload: LocalNotificationPayload,
): Promise<void> {
  const capabilities = getPlatformCapabilities();
  if (capabilities.isAndroid) {
    await NativeLocalNotifications.deliver(payload);
    return;
  }
  if (
    !capabilities.browserNotificationsSupported ||
    getLocalNotificationPermission() !== 'granted'
  ) {
    return;
  }

  // Browser execution is retained only as a test harness. Public notification
  // delivery belongs to the Android native adapter.
}
