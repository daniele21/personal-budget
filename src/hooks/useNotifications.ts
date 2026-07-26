import { useCallback, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../data/storageKeys';
import { CustomReminder, NotificationPreferences, NotificationRecord } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../repositories/portablePreferencesRepository';
import {
  deliverLocalNotification,
  getLocalNotificationPermission,
  requestLocalNotificationPermission,
} from '../services/platformNotificationService';

export function useNotifications() {
  const [preferences, setPreferences] = useLocalStorage<NotificationPreferences>(
    STORAGE_KEYS.notificationPreferences,
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [reminders, setReminders] = useLocalStorage<CustomReminder[]>(STORAGE_KEYS.customReminders, []);
  const [records, setRecords] = useLocalStorage<NotificationRecord[]>(STORAGE_KEYS.notificationRecords, []);
  const [permission, setPermission] = useState<NotificationPermission>(
    getLocalNotificationPermission,
  );

  const unreadCount = useMemo(() => records.filter((record) => !record.read).length, [records]);

  const requestPermission = useCallback(async () => {
    const nextPermission = await requestLocalNotificationPermission();
    setPermission(nextPermission);
    if (nextPermission === 'granted') {
      setPreferences((current) => ({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...current, enabled: true }));
    }
    return nextPermission;
  }, [setPreferences]);

  const updatePreferences = useCallback((patch: Partial<NotificationPreferences>) => {
    setPreferences((current) => ({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...current, ...patch }));
  }, [setPreferences]);

  const addRecord = useCallback((record: Omit<NotificationRecord, 'id' | 'createdAt' | 'read'>) => {
    const nextRecord: NotificationRecord = {
      ...record,
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11),
      createdAt: new Date().toISOString(),
      read: false,
    };
    setRecords((current) => [nextRecord, ...current].slice(0, 50));
    return nextRecord;
  }, [setRecords]);

  const markAllRead = useCallback(() => {
    setRecords((current) => current.map((record) => ({ ...record, read: true })));
  }, [setRecords]);

  const addReminder = useCallback((input: Pick<CustomReminder, 'title' | 'date' | 'note'>) => {
    const reminder: CustomReminder = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11),
      title: input.title,
      date: input.date,
      note: input.note,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setReminders((current) => [reminder, ...current]);
    return reminder;
  }, [setReminders]);

  const deleteReminder = useCallback((id: string) => {
    setReminders((current) => current.filter((reminder) => reminder.id !== id));
  }, [setReminders]);

  const completeReminder = useCallback((id: string) => {
    setReminders((current) => current.map((reminder) => (
      reminder.id === id ? { ...reminder, completed: true } : reminder
    )));
  }, [setReminders]);

  const notifyNative = useCallback(async (record: NotificationRecord) => {
    if (!preferences.enabled || permission !== 'granted') return;
    await deliverLocalNotification(record);
  }, [permission, preferences.enabled]);

  return {
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...preferences },
    updatePreferences,
    permission,
    requestPermission,
    reminders,
    addReminder,
    deleteReminder,
    completeReminder,
    records,
    addRecord,
    markAllRead,
    unreadCount,
    notifyNative,
  };
}
