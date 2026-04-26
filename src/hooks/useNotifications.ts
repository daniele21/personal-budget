import { useCallback, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../data/storageKeys';
import { CustomReminder, NotificationPreferences, NotificationRecord } from '../types';
import { useLocalStorage } from './useLocalStorage';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  budgetAlerts: true,
  recurringReminders: true,
  customReminders: true,
  reminderLeadDays: 1,
};

export function useNotifications() {
  const [preferences, setPreferences] = useLocalStorage<NotificationPreferences>(
    STORAGE_KEYS.notificationPreferences,
    DEFAULT_PREFERENCES,
  );
  const [reminders, setReminders] = useLocalStorage<CustomReminder[]>(STORAGE_KEYS.customReminders, []);
  const [records, setRecords] = useLocalStorage<NotificationRecord[]>(STORAGE_KEYS.notificationRecords, []);
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission;
  });

  const unreadCount = useMemo(() => records.filter((record) => !record.read).length, [records]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermission('denied');
      return 'denied' as NotificationPermission;
    }
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission === 'granted') {
      setPreferences((current) => ({ ...DEFAULT_PREFERENCES, ...current, enabled: true }));
    }
    return nextPermission;
  }, [setPreferences]);

  const updatePreferences = useCallback((patch: Partial<NotificationPreferences>) => {
    setPreferences((current) => ({ ...DEFAULT_PREFERENCES, ...current, ...patch }));
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
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'AURA_SHOW_NOTIFICATION',
        payload: {
          title: record.title,
          body: record.body,
          route: record.route,
          tag: record.dedupeKey ?? record.id,
        },
      });
      return;
    }
    new Notification(record.title, { body: record.body, data: { route: record.route } });
  }, [permission, preferences.enabled]);

  return {
    preferences: { ...DEFAULT_PREFERENCES, ...preferences },
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
