# Solution Strategy

## Chosen Direction

Aura Finance remains a local-first personal budget PWA. Cloud storage is limited to an explicit opt-in encrypted backup used for restore across devices.

## Decisions

### Cloud Backup

Chosen: opt-in encrypted backup with visible status.

Rationale: financial records are sensitive; users should know when data leaves the device. Firestore stores only encrypted backup payloads tied to the authenticated UID.

### Categories

Chosen: archive categories instead of deleting historical meaning.

Rationale: deleting a category from the active picker should not erase the semantic label attached to old transactions, budgets, recurring items, or reports.

### Recurring Entries

Chosen: model recurring entries as frequency-based templates with explicit start and end dates. Supported frequencies are daily, weekly, monthly, and yearly. Monthly entries keep month-based keys for backward compatibility; non-monthly entries use occurrence-date keys so multiple generated transactions in the same month can be deduped and edited independently.

Rationale: a recurring payment must stay stable as the source pattern while still allowing one-off adjustments, such as a single mortgage installment changing from 100 to 102 without rewriting the whole plan. Daily and weekly entries need occurrence-level keys because several generated transactions can exist in the same calendar month.

### AI

Chosen: no AI in current scope.

Rationale: the product value is reliable budgeting and reporting. AI would add privacy, governance, cost, and explanation burden without a confirmed user need.

### Advanced Reporting

Chosen: add local-only global search, period comparison, and year-in-review reporting from data already stored in the browser.

Rationale: these features increase navigation and analysis value without changing the storage model, adding external processors, or exposing financial records to an admin or backend.

### Notifications

Chosen: local-only web notifications using browser permission, local preferences, local reminders, and the existing service worker.

Rationale: budget alerts, recurring reminders, and custom reminders should preserve the local-first privacy posture. Firebase Cloud Messaging or backend scheduling is intentionally out of scope because it would introduce provider cost, operational complexity, and additional privacy documentation.

Recurring items may carry their own reminder setting, including due-date reminders and short lead-time reminders. The global recurring reminder preference remains the master switch, while each recurring item can opt in or out of its own local reminder.

Known limitation: web notifications are browser and platform dependent. On iOS, reliable notification behavior requires the app to be installed as a PWA on supported versions.

### Admin

Chosen: admin manages access allowlist only.

Rationale: the admin should decide who can access the app, not read personal financial records.

## Accepted Tradeoffs

- Local-first storage favors privacy and simplicity, but large transaction histories may eventually need IndexedDB-backed domain repositories.
- Encrypted Firestore backup improves restore capability, but requires clear user-facing status and deletion controls.
- Category archive is simpler than a full category entity model; a future migration to category IDs may be needed for stronger rename semantics.
- Local-only notifications are simpler and more private than cloud push, but they cannot guarantee delivery when the browser or installed PWA is not allowed to run.
- Year-in-review sharing uses text summary sharing/copy in v1; PNG export remains a future option to avoid adding a heavy DOM capture dependency.
