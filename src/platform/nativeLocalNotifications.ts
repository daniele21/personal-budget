import { registerPlugin } from '@capacitor/core';

export interface NativeLocalNotificationPayload {
  id: string;
  title: string;
  body: string;
  route?: string;
  dedupeKey?: string;
}

interface NativeLocalNotificationsPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  deliver(payload: NativeLocalNotificationPayload): Promise<{ delivered: boolean }>;
  cancel(options: { id: string }): Promise<void>;
  cancelAll(): Promise<void>;
}

export const NativeLocalNotifications = registerPlugin<NativeLocalNotificationsPlugin>(
  'NativeLocalNotifications',
);

