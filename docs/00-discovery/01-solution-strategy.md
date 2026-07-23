# Solution Strategy

## Chosen Direction

Aura Finance remains a local-first personal budget PWA. Cloud storage is limited to an explicit opt-in encrypted backup used for restore across devices.

## Decisions

### Cloud Backup

Chosen: opt-in encrypted backup with visible status.

Rationale: financial records are sensitive; users should know when data leaves the device. Firestore stores only encrypted backup payloads tied to the authenticated UID.

Each UID keeps the latest three encrypted `AppData` snapshots inside one
Firestore document. Rotation is transactional, every snapshot carries a stable
version ID and creation timestamp, and the user can select an exact version from
empty-workspace recovery or Data & Privacy. Explicit selection never falls back
to a different version; automatic corruption recovery may still try older valid
slots. The detailed contract is defined in
[`cloud-backup-version-history.md`](../specs/cloud-backup-version-history.md).

### Portable Disaster Recovery Archive

Chosen: add a versioned, local-only `.aura` archive as the complete manual disaster-recovery mechanism, separate from transaction CSV import/export and the existing cloud-backup transport.

Rationale: CSV is appropriate for analysis and interoperability, but it cannot reconstruct the complete workspace or safely represent attachments, preferences, integrity metadata, and schema evolution. V1 therefore includes canonical `AppData`, referenced attachments, notification preferences, custom reminders, and appearance preference while excluding identity, session, cache, notification-history, navigation, and cloud-enablement state.

Archive processing happens entirely in the browser and is classified before spreadsheet parsing or AI categorization. Passphrase protection is selected by default but is not mandatory because a forgotten passphrase would make disaster recovery impossible. Encryption keys derive from the user-provided passphrase with per-archive random parameters and are never bound to Firebase UID.

Restore is replace-only in V1. The application validates, migrates, normalizes, stages, safety-protects, commits, and verifies the complete archive. A restore journal and staged attachments provide deterministic resume or rollback behavior across localStorage and IndexedDB. Core-data corruption blocks restore before mutation; damaged attachments may be reported as warnings and restored only after explicit confirmation.

The archive codec may later be reused by cloud backup, but V1 does not assume that the current Firestore transport can store arbitrary attachment volume or use the same persistence layout. The technical format and recovery protocol are fixed in [`ADR 0001`](../../adr/0001-aura-portable-archive-v1.md), and delivery progress is tracked in [`10-portable-archive-progress-plan.md`](./10-portable-archive-progress-plan.md).

### Data Model

Chosen: keep the persisted app data model centralized in `src/data/model.ts`.

Rationale: transactions, budgets, recurring entries, accounts, categories, savings goals, and monthly budget must have one canonical shape shared by local storage, cloud backup, demo data, and app context. The context may orchestrate React state, but it should not define a parallel data contract. The model layer owns initial app data, normalization of restored or partial data, recurring transaction sync, and financial emptiness checks.

Application state may extend `AppData` with UI and workflow metadata such as
onboarding status. Persistence boundaries must project richer state onto the
explicit canonical `AppData` fields before strict schema validation; they must
not weaken the archive schema or implicitly serialize top-level metadata.

Accounts use `openingBalance`, not a live balance. Total Net Worth is defined as the sum of account opening balances plus the net result of every transaction in the ledger. Persisted local or backup data that still uses the legacy `balance` field is normalized to `openingBalance` when loaded. A future live-balance model would require transactions to be assigned to accounts and is intentionally outside the current scope.

### Categories

Chosen: archive categories instead of deleting historical meaning.

Rationale: deleting a category from the active picker should not erase the semantic label attached to old transactions, budgets, recurring items, or reports.

### Recurring Entries

Chosen: model recurring entries as frequency-based templates with explicit start and end dates. Supported frequencies are daily, weekly, monthly, and yearly. Monthly entries keep month-based keys for backward compatibility; non-monthly entries use occurrence-date keys so multiple generated transactions in the same month can be deduped and edited independently.

Rationale: a recurring payment must stay stable as the source pattern while still allowing one-off adjustments, such as a single mortgage installment changing from 100 to 102 without rewriting the whole plan. Daily and weekly entries need occurrence-level keys because several generated transactions can exist in the same calendar month.

Recurring entries are materialized into individual linked transactions for every due occurrence from the recurring start date through the current day. The application context owns this sync: it first reconciles existing linked history against the recurring source of truth, then generates missing due transactions. Reports, budgets, history, comparisons, and year review all read from the same transaction ledger. Future recurring occurrences remain planned items, not report transactions, until they are due.

### AI

Chosen: no AI in current scope.

Rationale: the product value is reliable budgeting and reporting. AI would add privacy, governance, cost, and explanation burden without a confirmed user need.

### Advanced Reporting

Chosen: add local-only global search, period comparison, and year-in-review reporting from data already stored in the browser.

Rationale: these features increase navigation and analysis value without changing the storage model, adding external processors, or exposing financial records to an admin or backend.

Insights presents spending pace as three fixed rolling averages instead of a configurable statistical average: daily pace is trailing seven-day spend divided by seven, weekly pace is trailing twenty-eight-day spend divided by four, and monthly pace is trailing ninety-day spend divided by three. The summary shows the latest value for all three scales; its detail view uses a single chart with a Day, Week, or Month selector. Preset periods contain only complete calendar months and always end on the final day of the previous month; for example, `3M` shows the three complete months before the current month. The selected scale controls the averaging horizon within that complete-month history.

Custom report periods must have a start date on or before the end date. The control blocks invalid input and range construction normalizes it defensively. Category comparison trends use weekly buckets for ranges up to 45 days and real calendar-month buckets for longer ranges. Spending Pace uses the requested custom period only through the earlier of its end date and today. Cash-flow comparisons compare current net cash flow with previous-period net cash flow; previous income is not treated as a savings goal.

Rationale: fixed, named windows answer the practical question of how quickly spending is changing without exposing smoothing configuration or conflating the selected reporting period with the rolling calculation.

### Information Architecture And UX Simplification

Chosen: use `Home | Transactions | Add | Budgets | Reports` as the primary mobile shell. `Add` is a global transaction action rather than a navigation destination, so the shell contains four destinations plus one prominent action in five equal-width slots. More remains a secondary tools/settings area reached through a fixed `…` action in every header; the account avatar links to Profile. The narrow-width implementation must keep Add icon-only, use a restrained active state, and avoid clipping or horizontal scrolling at 320 px and 360 px.

Reports becomes the only full analytics area, organized as `Overview | Categories | Compare | Year`. Existing Insights, Compare, and Year Review calculations remain local and deterministic, but are recomposed into this hierarchy. Existing `/insights`, `/compare`, and `/year-review` routes remain aliases or deep links to the appropriate report view.

Calendar and recurring management become a single Planning area organized as `Calendar | Recurring`, with one shared recurring-entry form and orchestration path. Existing `/calendar` and `/recurring` routes remain deep links to the appropriate view.

The Planning month summary distinguishes historical, current, and future months. Historical and future summaries include all scheduled expense occurrences; the current month includes only occurrences due today or later and labels them as remaining.

Home and Budgets default to the Actual analytics lens and expose a minimal `Actual | Net` control. Reports exposes the complete `Actual | Net of extras | Extras only` control. The active lens must always be visible; Net must explain that extras are excluded. Home and Budgets may share this UI state for the active app session, but a new session returns to Actual so the app never silently hides real cash activity.

The compact Home control is positioned separately from the centered month label, and Budgets keeps it in the focal-summary header. Reports places its full three-state control in a focus-managed `View options` bottom sheet; the trigger always names the active lens so report scope is never implicit.

Add Transaction uses progressive disclosure for optional fields. Type and amount share one compact entry surface; title, category, date, and reporting treatment remain immediately visible in a grouped form. Payment method, notes, and receipt attachment live under `More options`. The section opens automatically when an edited transaction contains meaningful advanced values, the save action stays reachable above the bottom navigation, and recurring-occurrence notices and validation remain visible.

Rationale: the primary shell should prioritize daily budgeting work while keeping analytics directly reachable. Consolidating analytics and planning removes overlapping destinations and duplicated forms. A compact but explicit lens control preserves advanced analysis without making it the dominant Home interaction.

### Safe To Spend

Chosen: calculate safe-to-spend against the lower value between the configured monthly budget and the current month's income, then subtract current-month expenses.

Rationale: the dashboard should not show spendable room based only on expenses when the monthly net flow cannot support it. The configured budget remains the spending cap, while current income prevents overstating safe cash pressure in low-income or partial-income months.

The dashboard lets users switch Safe to Spend between `Actual` and `Net`, matching the category spending lens so one-off income and expenses can either be included in cash-pressure decisions or excluded from normalized planning. Actual remains the default, and the compact control always exposes its active state.

Safe to Spend uses budgetable cash inflow for the effective limit, not reportable income. Reimbursements reduce expenses in the period where they are recorded, but they do not act as the income cap for Safe to Spend because a refund-only month would otherwise shrink the safe limit to the refund amount. If no budgetable income is recorded for the month, the configured monthly budget remains the limit.

### Reimbursements

Chosen: income transactions can be marked as `reimbursement`; reimbursements are mutually exclusive with `extra`.

Rationale: a reimbursement is a real cash inflow, but it is not income for reporting purposes. It should increase net cash position by reducing expenses in the period where it is recorded instead of inflating income totals or becoming the Safe to Spend income cap. Reimbursements remain category-aware so a medical refund, travel refund, or purchase return can offset the matching expense category when categorized consistently. Expense totals are floored at zero so reimbursements cannot create negative spending or inflate Safe to Spend above the effective budget or income cap.

### Notifications

Chosen: local-only web notifications using browser permission, local preferences, local reminders, and the existing service worker.

Rationale: budget alerts, recurring reminders, and custom reminders should preserve the local-first privacy posture. Firebase Cloud Messaging or backend scheduling is intentionally out of scope because it would introduce provider cost, operational complexity, and additional privacy documentation.

Recurring items may carry their own reminder setting, including due-date reminders and short lead-time reminders. The global recurring reminder preference remains the master switch, while each recurring item can opt in or out of its own local reminder.

Known limitation: web notifications are browser and platform dependent. On iOS, reliable notification behavior requires the app to be installed as a PWA on supported versions.

### PWA Install Action

Chosen: on the first eligible authenticated browser access, show one install
dialog after initial-data selection and onboarding have completed. Keep a
compact install action in the authenticated top bar and the descriptive action
in More for later use. The top-bar action remains visible whenever Aura is
running as a browser tab and falls back to browser-menu guidance when no native
prompt exists. The introductory dialog and More action appear only when the
browser exposes a real native prompt or when iOS guidance is actionable.

Rationale: Aura Finance already ships a manifest and service worker, but
installation is most discoverable during the first successful setup but remains
an occasional action afterward. A browser-local flag prevents the introductory
dialog from appearing again once it has actually been shown; dismissing it does
not remove the persistent top-bar and More actions. Chromium can
emit the one-shot `beforeinstallprompt` event during initial page load, before
the lazy-loaded More route mounts, so the app captures and retains it from the
main entrypoint. The button then invokes the native prompt on supported Android
and desktop Chromium browsers. iOS requires concise manual guidance through
Safari, Share, Add to Home Screen, and Open as Web App because JavaScript cannot
open a native install prompt there. The action is hidden after installation or
when no real installation path is available.

### Admin

Chosen: admin manages access allowlist only.

Rationale: the admin should decide who can access the app, not read personal financial records.

## Accepted Tradeoffs

- Local-first storage favors privacy and simplicity, but large transaction histories may eventually need IndexedDB-backed domain repositories.
- Encrypted Firestore backup improves restore capability, but requires clear user-facing status and deletion controls.
- Category archive is simpler than a full category entity model; a future migration to category IDs may be needed for stronger rename semantics.
- Local-only notifications are simpler and more private than cloud push, but they cannot guarantee delivery when the browser or installed PWA is not allowed to run.
- Year-in-review sharing uses text summary sharing/copy in v1; PNG export remains a future option to avoid adding a heavy DOM capture dependency.
- PWA install prompting depends on browser support. iOS cannot trigger native installation from JavaScript, so the app shows manual install instructions instead.
- A complete portable archive increases client memory and implementation complexity because it includes attachments and must bridge localStorage and IndexedDB; explicit limits, staging, self-verification, and a restore journal are required from V1.
- Optional plaintext export preserves recoverability for users who cannot retain a passphrase, but exposes sensitive financial and receipt data; encryption remains selected by default and plaintext requires an explicit warning.
