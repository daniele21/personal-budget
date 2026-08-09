# Solution Strategy

## Chosen Direction

Aura Finance is a local-first Android application distributed through
Capacitor. The React/Vite application remains the canonical bundled runtime and
browser regression harness; the PWA and full hosted financial application are
retired. Cloud storage remains limited to an explicit opt-in encrypted backup
used for restore across devices.

Production Android builds use bundled web assets rather than a remote
`server.url`. Public web hosting is limited to landing, privacy, support and
account-deletion surfaces. This distribution decision is fixed in
[`ADR 0006`](../../adr/0006-aura-android-only-distribution.md).

## Decisions

### Android Companion And Payment Detection

Chosen: use the Android Capacitor application as the only product distribution
and implement optional local payment detection through a custom Kotlin plugin.

Rationale: notification access requires Android native APIs, but Aura's existing React UI, financial domain, storage behavior, accessibility work, cloud backup, and archive workflows should not be duplicated. Capacitor provides the smallest native boundary that satisfies the requirement.

Platform baseline:

- Android application ID: `com.staituned.aura`, with final Play availability and namespace-control verification before publication;
- Capacitor 8;
- `minSdk` 36; the first release supports Android 16 only;
- `compileSdk` and `targetSdk` 36 for the planned 2026 release;
- debug application suffix `.debug`, non-production Firebase/OAuth configuration, and debug signing isolated from release;
- local bundled web assets in production;
- Play internal testing, then closed beta, then explicit opt-in production rollout;
- no iOS native application in the MVP.

Payment-detection boundary:

- disabled by default;
- supported and user-selected packages only;
- package gate before reading title/text extras;
- deterministic Kotlin parsing with bundled rules and no network;
- EUR card payments only in the first product pilot;
- synthetic source for the technical spike;
- no card/account identifiers, SMS, Accessibility Service, Open Banking, remote rules, LLM, or automatic transaction creation;
- private lock-screen notification with a redacted public representation;
- no custom candidate telemetry.

`PaymentCandidate` is a native, short-lived workflow object and never becomes a second financial ledger. React begins an acceptance operation, receives a native-reserved UUID, creates a normal transaction using that UUID, verifies persistence, and completes the native operation. On interruption, recovery checks the reserved transaction ID in canonical `AppData`. This provides idempotence without adding source-package, rule, fingerprint, or candidate fields to `Transaction`.

Native candidates, preferences, fingerprints, and tombstones are excluded from Aura cloud backup, portable archives, Android cloud backup, and device-to-device transfer. The structured candidate payload is authenticated and encrypted with a non-exportable Android Keystore key. Detection is suspended without an active owner, native data is partitioned by a hash of the Firebase UID, and logout, account change, local reset, and total deletion purge the native store.

Detailed progress and unresolved external gates are tracked in [`11-android-payment-detection-progress-plan.md`](./11-android-payment-detection-progress-plan.md). Runtime and acceptance decisions are fixed in [`ADR 0002`](../../adr/0002-aura-android-capacitor-runtime.md) and [`ADR 0003`](../../adr/0003-aura-payment-candidate-acceptance.md).

Promotion of the complete Android product through Play internal testing,
closed beta and production is governed by
[`13-android-production-release-plan.md`](./13-android-production-release-plan.md).
That tracker owns the cross-feature release gates for public access, account
deletion, production configuration, privacy/Data Safety, landing/store
presence, physical-device evidence, rollout and rollback.

Release scope confirmed on 2026-08-04:

- internal testing precedes an allowlisted closed beta; public self-service is
  not authorized by the current decision;
- payment detection is beta-only; initial production is a core-only variant
  without listener, source package visibility or payment rules;
- internal and beta support Android 16/API 36 only;
- Italy is the initial country, with English UI, store and support content and
  an 18+ target audience; European expansion requires a later rollout decision;
- the product is free and introduces no billing dependency;
- the personal developer identity is Daniele Moltisanti;
- public landing/legal/support surfaces use `aura.staituned.com`, with
  `support@staituned.com` as the public channel.

The build-variant consequence of beta-only detection is accepted in
[`ADR 0004`](../../adr/0004-aura-payment-detection-beta-only-release.md).
The owner confirms the personal Play account, applicable verification and
registration of `com.staituned.aura`. Single-person support risk is accepted
for Internal Testing only, with a one-week response target; a backup owner
remains a closed-beta gate.

Account deletion uses a separate fail-closed cross-storage orchestrator rather
than the local reset reducer. Recent reauthentication precedes UID-scoped backup
deletion, native purge, finite browser-data deletion and Firebase Auth identity
deletion. The durable ordering and allowlist authorization constraint are fixed
in [`ADR 0005`](../../adr/0005-aura-account-deletion-orchestration.md), with the
user contract in [`account-deletion-v1.md`](../specs/account-deletion-v1.md).

### Cloud Backup

Chosen: opt-in encrypted backup with visible status.

Rationale: financial records are sensitive; users should know when data leaves the device. Firestore stores only encrypted backup payloads tied to the authenticated UID.

Each UID keeps the latest five encrypted `AppData` snapshots as bounded
user-scoped version documents below `backups/{uid}`. The parent stores metadata
and a temporary latest-payload compatibility mirror. Rotation is concurrency
safe, every snapshot carries a stable version ID and creation timestamp, and the
user can select an exact version from empty-workspace recovery or Data &
Privacy. Explicit selection never falls back to a different version; automatic
corruption recovery may still try older valid versions. Deletion enumerates and
verifies all version documents before removing the parent. The storage decision
is fixed in [`ADR 0007`](../../adr/0007-aura-five-version-cloud-backup.md) and
the detailed contract is defined in
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

New materialized occurrences use a deterministic ID derived from recurring ID
and occurrence key. If that ID is already occupied by an unrelated transaction,
Aura adds a deterministic collision suffix. Reconciliation preserves every
historical linked transaction ID, so this correction requires no migration and
does not break existing edit links or attachments.

### Deterministic Transaction Import

Chosen: replace the current generic Gemini-assisted spreadsheet workflow with a
local-only structured CSV/XLSX import using the fixed columns `date`,
`description`, and `amount`.

Rationale: a strict file contract is less flexible than automatic bank-column
detection, but it is predictable, testable, private, inexpensive, and available
in both the PWA and bundled Android UI without a provider key. The date is
required because description and amount alone cannot preserve reliable history
or calendar-month reporting. Positive amounts become income and negative
amounts become expenses.

The user reviews valid rows before commit. Rows begin as `Uncategorized` unless
the user assigns an active category. A category may be applied to one row, a
manual selection, or all included rows sharing the same conservatively
normalized description and transaction type. Matching does not persist a rule
or modify historical transactions. Permanent merchant-category rules remain
out of scope until category identities and lifecycle semantics are stable.

Possible duplicates use a different key: calendar date, signed amount in cents,
and normalized description. They are warnings only and are never removed
automatically. The commit validates, persists, reads back, and verifies the next
canonical `AppData` before success. Imported rows become ordinary transactions;
no source, import-batch, matching, or duplicate metadata is added to
`Transaction`.

The `.aura` signature is classified first, Aura transaction CSV compatibility
remains separate, and the structured path makes no network, Firebase, analytics
or AI call. Detailed delivery is tracked in
[`12-deterministic-transaction-import-progress-plan.md`](./12-deterministic-transaction-import-progress-plan.md).

Implementation status: M1 provides the separated `data/import`, `domain/import`
and `services/import` boundaries, bounded CSV/XLSX readers, typed validation and
local template builders. M2 adds the in-memory review model, independent
matching and duplicate keys, ledger fingerprint, summaries, category commands,
delta undo and secure canonical mapping. M3 moves the visible wizard to those
boundaries with local validation, paginated categorization and explicit review.
M4 adds transaction-only verified persistence with exact read-back, rollback,
session undo and per-ID history batch correction. M5 removes the provider SDK,
runtime, client key configuration and admin surfaces; retires the exact legacy
cache namespace; and verifies both web and Android artifacts. The canonical
schemas remain unchanged. Historical Firestore documents are untouched and
their deny-all rule migration remains a separate release decision.

### AI

Chosen: no AI in current scope.

Rationale: the product value is reliable budgeting and reporting. AI would add
privacy, governance, cost, and explanation burden without a confirmed user
need. The previous provider-assisted import has been retired. Reintroducing AI
requires new discovery, privacy/subprocessor review, governance and explicit
approval.

### Advanced Reporting

Chosen: add local-only global search, period comparison, and year-in-review reporting from data already stored in the browser.

Rationale: these features increase navigation and analysis value without changing the storage model, adding external processors, or exposing financial records to an admin or backend.

Category reporting uses a shared, pure calendar-month aggregation model. The
Categories view keeps the selected-period total as its primary ranking and adds
an average monthly amount when at least two complete calendar months exist.
Selecting a category opens a category report that preserves the selected period
and analytics lens, plots one point for every calendar month including zero
months, distinguishes partial months, and shows the five highest-impact
transactions before linking to the complete filtered history.

Selected-period totals include every transaction inside the requested range,
including transactions in partial months. Monthly averages exclude any partial
boundary month and the current incomplete month. The UI always exposes the
number of complete months used, so a total covering a partial current month is
not presented as if it shared the average's denominator.

Spending Pace uses one reimbursement-aware monthly baseline rather than
independent short rolling windows. Monthly pace is the average net reportable
expense over up to the latest three eligible complete calendar months. Daily
and weekly values are equivalents derived from that same monthly baseline using
`monthly * 12 / 365.2425` and `daily * 7`. Months after the earliest ledger
activity with no reportable expense count as zero; months before the ledger has
any activity are not invented as history. The UI names the number of available
complete months when fewer than three exist.

The Spending Pace detail shows actual complete-month expense together with its
up-to-three-month moving average. Standard preset histories end on the final
day of the previous month; a custom range contributes only fully enclosed,
already completed calendar months. The old Day, Week, and Month trend selector
is removed because three rescalings of one monthly baseline do not represent
three independent signals.

Custom report periods must have a start date on or before the end date. The
control blocks invalid input and range construction normalizes it defensively.
Cash-flow comparisons compare current net cash flow with previous-period net
cash flow; previous income is not treated as a savings goal.

Rationale: calendar-month aggregation absorbs the posting pattern of rent,
subscriptions, utilities, and other monthly expenses. Keeping partial months in
actual totals but outside averages preserves factual cash reporting without
allowing incomplete periods to depress the baseline.

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

Chosen: calculate Safe to Spend as the configured monthly budget minus the selected lens's net current-month expenses, floored at zero.

Rationale: the configured monthly budget is an explicit planning limit, while recorded income is ledger activity that may be incomplete or entered at any point in the month. Using recorded income as the effective limit created a discontinuity: no recorded income used the full budget, while the first small income transaction replaced that budget with the transaction amount. Ordinary and extra income therefore affect cash-flow reporting but never change the monthly spending limit.

The dashboard lets users switch Safe to Spend between `Actual` and `Net`, matching the category spending lens so one-off expenses can either be included in the remaining-budget calculation or excluded from normalized planning. Income totals follow the selected reporting lens but do not affect Safe to Spend. Actual remains the default, and the compact control always exposes its active state.

Reimbursements reduce net expenses in the period where they are recorded and can restore remaining budget up to, but never beyond, the configured monthly limit. Safe to Spend is a planning metric rather than an account-balance or liquidity guarantee. A future cash-funded limit would require a separate explicit funding model and must not be inferred from individual income transactions.

### Reimbursements

Chosen: income transactions can be marked as `reimbursement`; reimbursements are mutually exclusive with `extra`.

Rationale: a reimbursement is a real cash inflow, but it is not income for reporting purposes. It should increase net cash position by reducing expenses in the period where it is recorded instead of inflating income totals or changing the monthly budget. Reimbursements remain category-aware so a medical refund, travel refund, or purchase return can offset the matching expense category when categorized consistently. Expense totals are floored at zero so reimbursements cannot create negative spending or inflate Safe to Spend above the configured monthly budget.

### Notifications

Chosen: local-only Android notifications using local preferences, deterministic
reminder intents and a typed native scheduling adapter.

Rationale: budget alerts, recurring reminders, and custom reminders should preserve the local-first privacy posture. Firebase Cloud Messaging or backend scheduling is intentionally out of scope because it would introduce provider cost, operational complexity, and additional privacy documentation.

Recurring items may carry their own reminder setting, including due-date
reminders and short lead-time reminders. The global recurring reminder
preference remains the master switch, while each recurring item can opt in or
out of its own local reminder. Scheduling, reconciliation, reboot handling,
permission and cancellation are Android-native; no FCM or remote scheduler is
introduced.

### Public Web Surfaces

Chosen: keep only a minimal public portal for landing, privacy, support and
account deletion. It is deployed separately from the authenticated financial
application and does not expose PWA installation or service-worker behavior.

### Admin

Chosen: designated administrators manage the access allowlist only.

Rationale: administrators should decide who can access the app, not read
personal financial records. Application admin configuration and Firestore
authorization rules must remain synchronized and are covered by a regression
test.

## Accepted Tradeoffs

- Local-first storage favors privacy and simplicity, but large transaction histories may eventually need IndexedDB-backed domain repositories.
- Encrypted Firestore backup improves restore capability, but requires clear user-facing status and deletion controls.
- Category archive is simpler than a full category entity model; a future migration to category IDs may be needed for stronger rename semantics.
- Local-only Android notifications are simpler and more private than cloud
  push, but require lifecycle reconciliation across reboot, timezone and app
  updates.
- Year-in-review sharing uses text summary sharing/copy in v1; PNG export remains a future option to avoid adding a heavy DOM capture dependency.
- Android-only distribution reduces channel complexity but removes universal
  browser access; the public portal preserves legal, support and deletion paths.
- A complete portable archive increases client memory and implementation complexity because it includes attachments and must bridge localStorage and IndexedDB; explicit limits, staging, self-verification, and a restore journal are required from V1.
- Optional plaintext export preserves recoverability for users who cannot retain a passphrase, but exposes sensitive financial and receipt data; encryption remains selected by default and plaintext requires an explicit warning.
