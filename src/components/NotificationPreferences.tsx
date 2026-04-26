import React, { useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Switch } from './ui';
import { ReminderDialog } from './ReminderDialog';
import { useNotifications } from '../hooks/useNotifications';

/** Compact toggle row — label-only, no description text for scannability. */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-11">
      <p className="text-sm font-bold text-on-surface">{label}</p>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function NotificationPreferences() {
  const notifications = useNotifications();
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  const enableNotifications = async () => {
    const permission = await notifications.requestPermission();
    if (permission !== 'granted') {
      notifications.updatePreferences({ enabled: false });
    }
  };

  return (
    <Card className="space-y-4">
      {/* Compact header — icon + short intro */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface">Local notifications</p>
          <p className="text-micro text-on-surface-variant">Alerts and reminders, stored on-device.</p>
        </div>
      </div>

      {notifications.permission !== 'granted' ? (
        <Button fullWidth onClick={enableNotifications}>Enable notifications</Button>
      ) : (
        <Toggle
          checked={notifications.preferences.enabled}
          onChange={() => notifications.updatePreferences({ enabled: !notifications.preferences.enabled })}
          label="Notifications enabled"
        />
      )}

      <div className="space-y-1 pt-2 border-t border-outline-variant/10">
        <Toggle
          checked={notifications.preferences.budgetAlerts}
          onChange={() => notifications.updatePreferences({ budgetAlerts: !notifications.preferences.budgetAlerts })}
          label="Budget alerts"
        />
        <Toggle
          checked={notifications.preferences.recurringReminders}
          onChange={() => notifications.updatePreferences({ recurringReminders: !notifications.preferences.recurringReminders })}
          label="Recurring reminders"
        />
        <Toggle
          checked={notifications.preferences.customReminders}
          onChange={() => notifications.updatePreferences({ customReminders: !notifications.preferences.customReminders })}
          label="Custom reminders"
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-outline-variant/10">
        <div className="flex items-center justify-between">
          <p className="text-micro font-bold text-on-surface-variant">Custom reminders</p>
          <button type="button" onClick={() => setShowReminderDialog(true)} className="h-9 px-3 rounded-xl bg-primary text-on-primary text-xs font-bold inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {notifications.reminders.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No reminders yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.reminders.slice(0, 5).map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{reminder.title}</p>
                  <p className="text-micro text-on-surface-variant">{reminder.date}{reminder.completed ? ' · completed' : ''}</p>
                </div>
                <button type="button" onClick={() => notifications.deleteReminder(reminder.id)} className="w-9 h-9 rounded-xl text-tertiary hover:bg-tertiary/10 flex items-center justify-center" aria-label={`Delete reminder ${reminder.title}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReminderDialog isOpen={showReminderDialog} onClose={() => setShowReminderDialog(false)} onAdd={notifications.addReminder} />
    </Card>
  );
}
