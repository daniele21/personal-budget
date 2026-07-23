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

## Demo Data

When no local financial data exists, Aura Finance can populate a local demo ledger so the user can evaluate dashboard, budget, recurring, and reporting flows without entering personal data.

Demo data is generated in the browser and stored in the same local storage surfaces as normal user-entered data. It is not sent to Firestore by default. If an encrypted cloud backup is available and the user chooses to start from zero or use demo data instead of restoring it, local cloud backup is disabled to prevent accidental overwrite of the existing remote backup with blank or demo data.

## Notifications

Notification preferences, notification records, recurring reminder settings, and custom reminders are stored in localStorage. Native notifications use the browser Notification API and the existing service worker. Browser or operating-system notification services may display the notification on the device, but Aura does not send reminder or financial data to Firebase Cloud Messaging or any backend scheduler.

Known platform limitation: on iOS, reliable web notification behavior requires the app to be installed as a supported PWA.

## Portable Archive Export And Restore

Aura Portable Archive V1 is a user-initiated, browser-local disaster-recovery workflow. It processes financial transactions and descriptions, account labels and partial identifiers, budgets, goals, categories, recurring activity, reminder titles and notes, preferences, and user-selected receipt attachments.

The archive workflow:

- introduces no new backend, processor, subprocessor, AI provider, telemetry destination, or cross-border transfer;
- does not send archive content to Firebase, Gemini, or another network service;
- excludes authentication tokens, Firebase profile data, cloud-backup settings, and technical caches;
- offers passphrase-based authenticated encryption by default and requires an explicit warning acknowledgement for plaintext export;
- never persists the passphrase or intentionally logs decrypted content or personal financial fields.

The exported `.aura` file is a new user-controlled copy outside Aura-managed storage. Its retention, onward sharing, device/cloud synchronization, and deletion become the user's responsibility. Deleting local Aura data, deleting the optional cloud backup, closing an account, or handling a data-erasure request within Aura cannot delete copies that the user already exported. Product help and deletion responses must state this limitation plainly.

Restore is replace-only and user initiated. When meaningful local data exists, Aura requires explicit replacement confirmation and downloads a separate encrypted safety archive before destructive writes. A restore journal and rollback snapshots are retained locally only until verified completion or verified rollback; failed recovery preserves them because deletion would remove recovery evidence.

Engineering impact on rights handling:

- access/portability: `.aura` is a disaster-recovery artifact, not a claim that a legal portability response is complete or interoperable with third-party systems;
- rectification: restoring an older archive can intentionally replace newer local corrections, which is disclosed in the confirmation step;
- erasure: Aura can erase managed local/cloud copies but not user-exported files;
- retention/end of use: completed staging is deleted immediately; failed recovery staging is retained until recovery is resolved.

The repository does not currently contain the legal source register, processor RoPA, controller/processor role allocation, or a documented lawful-basis decision referenced by `AGENTS.md`. These are governance gaps requiring the product/privacy owner before a commercial GDPR-readiness claim. This engineering change does not establish legal certification or a new lawful basis.

No new DPIA trigger is apparent from the engineering design because processing is user initiated, local, introduces no monitoring or automated decision-making, and adds no recipient. The privacy owner must confirm this assessment in the project’s formal governance records.

The engineering processing record and privacy-owner approval checklist are maintained in [`portable-archive-processing-record.md`](./portable-archive-processing-record.md).
