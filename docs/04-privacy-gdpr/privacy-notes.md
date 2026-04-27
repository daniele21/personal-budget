# Privacy Notes

## Local-Only Feature Processing

Aura Finance computes global search, period comparison, year-in-review reports, notification schedules, and custom reminders locally in the browser.

These features do not introduce:

- a new backend API
- a push notification provider
- an AI provider
- a new subprocessor
- a new cross-device transfer
- admin visibility into financial records

Financial data remains local unless the user explicitly enables the existing encrypted Firestore backup.

## Notifications

Notification preferences, notification records, recurring reminder settings, and custom reminders are stored in localStorage. Native notifications use the browser Notification API and the existing service worker. Browser or operating-system notification services may display the notification on the device, but Aura does not send reminder or financial data to Firebase Cloud Messaging or any backend scheduler.

Known platform limitation: on iOS, reliable web notification behavior requires the app to be installed as a supported PWA.
