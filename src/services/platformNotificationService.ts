import { getPlatformCapabilities } from '../platform/platformCapabilities';

export interface LocalNotificationPayload {
  id: string;
  title: string;
  body: string;
  route?: string;
  dedupeKey?: string;
}

export function getLocalNotificationPermission(): NotificationPermission {
  const capabilities = getPlatformCapabilities();
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
  if (
    !capabilities.browserNotificationsSupported ||
    getLocalNotificationPermission() !== 'granted'
  ) {
    return;
  }

  if (
    capabilities.serviceWorkerSupported &&
    'serviceWorker' in navigator
  ) {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: 'AURA_SHOW_NOTIFICATION',
      payload: {
        title: payload.title,
        body: payload.body,
        route: payload.route,
        tag: payload.dedupeKey ?? payload.id,
      },
    });
    return;
  }

  new Notification(payload.title, {
    body: payload.body,
    data: { route: payload.route },
  });
}
