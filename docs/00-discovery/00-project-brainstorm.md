# Aura Finance Project Brainstorm

## Approved Initiative: Category Reporting And Calendar-Month Spending Pace

Discovery status: **converged for delivery planning** on 2026-07-29.

### Problem

The Categories report currently ranks category totals but sends a selected
category directly to filtered transaction history. It does not show how that
category changed month by month or identify the transactions that explain the
largest movements.

The report also omits a monthly average per category. Spending Pace uses
independent trailing seven-day, twenty-eight-day, and ninety-day windows, so a
monthly recurring charge can enter or leave a short window and materially
distort the daily or weekly reading. The pace path also does not currently
apply reimbursement semantics consistently with other report totals.

### Approved Direction

- Keep reporting in the shared React financial domain and UI used by the PWA
  and Android Capacitor distributions.
- Add a category-detail report reachable from each ranked category row.
- Preserve the selected period and `Actual | Net of extras | Extras only` lens
  when entering category detail.
- Plot one value per calendar month, retain zero-spend months, and mark a
  current or otherwise incomplete boundary month as partial.
- Show the five highest-impact category transactions and retain a link to the
  full filtered transaction history.
- Keep selected-period totals inclusive of partial months.
- Calculate category monthly averages only from complete calendar months and
  expose the denominator in the UI. Do not show the metric as reliable when
  fewer than two complete months are available.
- Replace independent short-window Spending Pace averages with one monthly
  baseline calculated from up to the latest three complete calendar months.
- Derive weekly and daily equivalents from the monthly baseline instead of
  calculating separate rolling histories.
- Make Spending Pace reimbursement-aware and apply the selected analytics lens
  before aggregation.
- Keep all calculations deterministic and local-only.

### Confirmed Decisions

#### Spending Pace Baseline

Confirmed: use a calendar-month baseline.

For `N` eligible complete months, where `1 <= N <= 3`:

```text
monthly pace = sum(net reportable expense for each eligible month) / N
daily equivalent = monthly pace * 12 / 365.2425
weekly equivalent = daily equivalent * 7
```

The UI must name `N`; it must not imply a three-month history when only one or
two complete history months exist.

#### Partial Months In Category Averages

Confirmed: exclude partial months from monthly averages.

The selected-period total may include a partial first month, partial last month,
or the current month. The average uses only fully enclosed, already completed
calendar months. A row may therefore show a total for the whole selected range
and an average explicitly labelled, for example, `Average over 2 complete
months`.

### Alternatives Rejected

#### Keep Independent Daily, Weekly, And Monthly Pace Windows

Rejected because the metrics describe different baselines and remain sensitive
to the posting day of monthly recurring expenses.

#### Treat Every Touched Month As A Full Month

Rejected because dividing a partial month by one full-month unit
systematically understates average spending.

#### Project Partial Months

Rejected because a projection is unstable when rent, subscriptions, utilities,
or reimbursements post early or late in the month.

#### Add A Separate Android Reporting Implementation

Rejected because the accepted Capacitor architecture already packages the
shared React UI and financial domain. A second implementation would create
calculation drift without adding product value.

### Safe Defaults

- Category detail inherits the selected report period and analytics lens.
- A one-month detail remains valid but contains one monthly point; the UI can
  encourage a longer period without silently changing scope.
- `Top transactions` means the five transactions with the largest absolute
  financial impact, with date descending as the tie-breaker.
- Archived categories remain reportable when referenced by historical
  transactions.
- The route may use the encoded category name in the current string-based
  category model. Durable category IDs remain a separate future migration.
- No new ADR is required because the accepted local-first, shared
  React/Capacitor architecture and canonical ledger remain unchanged.

### Convergence Gate

The foundational metric decisions are approved. Implementation may begin after
the feature specification and delivery slices are aligned with the solution
strategy and the required regression fixtures are identified.

## Current Initiative

The current approved initiative is **Aura Portable Archive V1**, a local-first disaster-recovery format that is separate from transaction CSV import and export.

Discovery status: **Converged for delivery planning** on 2026-07-22.

The living implementation tracker is [`10-portable-archive-progress-plan.md`](./10-portable-archive-progress-plan.md).

## Next Initiative: Android Payment Detection

Discovery status: **converged for a synthetic technical spike; M0 complete** on 2026-07-25. Real financial sources and signed distribution remain behind the external gates below.

Aura will continue as a PWA and gain a companion Android distribution through Capacitor. The Android build reuses the React product and adds a narrow Kotlin capability for opt-in notification-based payment candidates. The initiative does not turn the PWA into a deprecated fallback and does not create a separate financial domain.

### Problem

Users already receive a device notification after many card payments but must later re-enter amount, merchant, date, and category in Aura. This creates friction, omissions, and transcription errors.

### Approved Direction

- Keep PWA and Android available in parallel.
- Use one React/Vite product with platform adapters.
- Use Capacitor 8 and a custom Kotlin plugin rather than a React Native or full-native rewrite.
- Use package `com.staituned.aura` as the Android application ID, subject to final Play Console availability and domain-control verification before publication.
- Support Android 16/API 36 only in the first release, with min/target/compile SDK 36.
- Keep payment detection off by default.
- Process only supported and explicitly selected packages.
- Check the package before reading notification extras.
- Parse locally with bundled deterministic rules.
- Create a short-lived native candidate and require explicit review.
- Keep native code away from canonical `AppData`; React remains the only transaction writer.
- Reserve the final transaction UUID during native acceptance so cross-storage recovery does not require detection metadata in `Transaction`.
- Exclude notification text, card/account identifiers, pending candidates, native preferences, and tombstones from network, Aura backup/archive, and Android system backup.
- Use a synthetic notification producer for the technical spike.
- Start product validation with EUR card payments and at most one or two real apps after fixture governance is approved.

### Alternatives Considered

#### Replace The PWA With A Native App

Rejected. It would remove browser and desktop access, split delivery, and duplicate mature React behavior without improving the core detection capability.

#### React Native Or Full Kotlin Rewrite

Rejected for the MVP. It provides deeper native control but duplicates UI, domain logic, accessibility work, testing, and release maintenance.

#### Keep PWA Only

Rejected for the feature because a PWA cannot read notifications posted by other Android apps.

#### Read SMS Or Use Accessibility Service

Rejected. Both expand sensitive access beyond the minimum needed for the approved use case.

#### Cloud Or LLM Parsing

Rejected. Notification text is financial context and deterministic app-specific templates are sufficient for the pilot.

#### Persist Detection Metadata In Every Transaction

Rejected. Native acceptance instead reserves the final normal transaction ID and retains dedupe tombstones only for their short retention window.

### Remaining External Gates

- Verify `com.staituned.aura` availability in Play Console and confirm control of the `staituned.com` namespace before the first signed distributable.
- Install Android Studio 2025.2.1 or newer and Android SDK 36.
- Assign named product, Android, React, QA, security, privacy, and release owners.
- Select the first real payment app after a user-approved, redacted fixture source exists.
- Complete lawful-basis, role-allocation, data-inventory, retention, and DPIA screening with the privacy owner.
- Confirm Play Console developer verification, app signing, Data Safety, and prominent-disclosure evidence.

The living tracker is [`11-android-payment-detection-progress-plan.md`](./11-android-payment-detection-progress-plan.md). Architecture decisions are recorded in [`ADR 0002`](../../adr/0002-aura-android-capacitor-runtime.md) and [`ADR 0003`](../../adr/0003-aura-payment-candidate-acceptance.md).

## Problem

The existing CSV export is suitable for analysis and interoperability, but it cannot reconstruct Aura after local data loss. It exports transactions and budgets as separate downloads, while import restores only transactions and otherwise routes generic spreadsheet data through the AI-assisted bank-statement workflow.

A recovery artifact must instead preserve the complete user workspace, remain usable without cloud backup, and be read entirely on the device before any existing data is changed.

## Approved Product Direction

- Keep transaction CSV import and export as a separate interoperability feature.
- Introduce one versioned `.aura` file for complete local disaster recovery.
- Include canonical app data, attachments, notification preferences, custom reminders, and appearance preference.
- Exclude authentication/session data, Firebase identity data, caches, navigation state, notification history, and the cloud-backup enablement flag.
- Offer passphrase protection by default, with an explicit warned option to export without encryption.
- Use replace-only restore in V1; do not implement merge.
- Detect and process `.aura` archives before the spreadsheet/AI import path.
- Validate, migrate, normalize, stage, safety-copy, commit, and verify before declaring success.
- Add a restore journal because localStorage and IndexedDB cannot participate in one atomic transaction.
- Preserve legacy Aura transaction CSV import and generic bank-statement import.
- Keep manual portable archive delivery independent from the existing cloud-backup transport in V1.

## Alternatives Considered

### Expand The Existing CSV

Rejected because CSV cannot reliably represent the complete graph of Aura data, binary attachments, versioned migrations, integrity metadata, and restore state.

### App Data Only In V1

Rejected because an archive that omits receipts and user-created reminders would not satisfy the recovery promise.

### Merge Restore In V1

Rejected because duplicate IDs, recurring-materialization history, renamed categories, budgets, goals, and attachment conflicts make merge behavior difficult to explain and verify safely.

### Mandatory Encryption

Rejected because a forgotten passphrase would make disaster recovery impossible. Encryption remains selected by default, while unencrypted export requires an explicit warning and confirmation.

### Immediate Cloud-Backup Migration

Deferred. The archive codec should be reusable, but the current cloud transport must not be assumed to support arbitrary attachment volume or the same persistence layout.

## Remaining Non-Blocking Technical Discovery

These choices must be resolved in milestone M0, but they do not change the approved product direction:

- exact internal envelope/container encoding;
- whether a small archive dependency is justified or native browser primitives are sufficient;
- mobile memory and maximum archive-size budgets;
- exact key-derivation work factor and compatibility policy;
- detailed restore-journal recovery transitions;
- whether the archive format warrants the repository's first ADR.

## Convergence Gate

Discovery is considered converged because scope, recovery semantics, privacy boundary, encryption posture, AI isolation, and V1 non-scope are approved. Implementation may begin only after the M0 technical contract and test fixtures in the progress plan are complete.
