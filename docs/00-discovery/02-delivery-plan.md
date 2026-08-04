# Delivery Plan

## Planned Initiative: Android-Only Distribution, First-Run And Backup History

Aura plans to retire the PWA and full hosted web application as product
distribution channels while retaining the React/Vite application as bundled
Capacitor runtime and browser-based regression harness. The same program will
replace the current first-run race and 27-step global tour, increase encrypted
cloud history from three to five recoverable versions, provide native Android
delivery for retained reminders, and add mobile/accessibility acceptance.

The execution source of truth, decision gates, milestone dashboard, task-level
progress, risks, evidence register and definitions of ready/done are maintained
in
[`16-android-only-onboarding-backup-progress-plan.md`](./16-android-only-onboarding-backup-progress-plan.md).

Implementation has not started. M0 must first reconcile the project brief,
solution strategy, accepted ADRs and release trackers that currently describe
PWA + Android dual distribution, and must freeze the five-version storage and
native-reminder decisions before their dependent slices begin.

## Implemented Initiative: Category Reporting And Calendar-Month Spending Pace

The product and metric decisions were approved and implemented on 2026-07-29.
The implementation remains in the shared React application and financial domain used by both
the hosted PWA and the bundled Android Capacitor application. The detailed
behavioral contract is
[`category-reporting-and-monthly-pace.md`](../specs/category-reporting-and-monthly-pace.md).

### Definition Of Ready

- [x] Category detail, transaction drill-down, and per-category average are in
  approved scope.
- [x] Spending Pace uses one calendar-month baseline.
- [x] Partial months remain in selected-period totals but are excluded from
  monthly averages.
- [x] The shared React/Capacitor architecture and local-only privacy boundary
  are confirmed.
- [x] The user-facing contract, edge cases, and denominator labels are
  specified.
- [x] Baseline test fixtures for month boundaries, sparse history,
  reimbursements, analytics lenses, and partial custom ranges are prepared
  before changing production calculations.

### Completion Record

- R0-R3 are implemented in the shared reporting domain and React route layer.
- `npm run test:regression` passes with 85 Vitest files and 394 tests, followed
  by the production Vite build.
- Android `testDebugUnitTest`, debug asset synchronization, `assembleDebug`, and
  all 34 API 36 instrumentation tests pass with the same shared reporting
  bundle.
- Real-browser responsive QA passed at 390 px and 320 px without horizontal
  overflow. The drill-down, period/lens scope, partial-month label, transaction
  preview, filtered-history URL, and insufficient pace-history state were
  inspected.
- No migration, backend deployment, external provider, or stored-data rollback
  step is required.

### Delivery Slices

#### R0. Domain Contract And Regression Fixtures

Dependencies: none.

- Add pure calendar-month boundary and bucket helpers in a focused reporting
  domain module rather than expanding page-level calculations.
- Add a category-report result containing selected-period total, complete-month
  average metadata, monthly points, and ranked transaction impacts.
- Add a Spending Pace result containing actual complete-month totals, the
  up-to-three-month moving average, daily and weekly equivalents, and the
  available-history denominator.
- Apply `Actual | Net of extras | Extras only` before both aggregations.
- Use the canonical reimbursement treatment and prevent a reportable expense
  bucket from becoming negative.
- Cover local-time month boundaries, year boundaries, leap years, zero months,
  sparse ledgers, archived category references, and custom partial ranges.

Exit gate: pure domain tests demonstrate the approved formulas without any UI
dependency.

#### R1. Category Ranking Monthly Average

Dependencies: R0.

- Keep category total and share as the primary ranked-list values.
- Add average monthly category spending when at least two complete calendar
  months exist.
- Label the exact denominator, including when the selected total also contains
  a partial month.
- Preserve the existing mobile-first list, supplementary desktop donut, report
  lens, empty state, and ordering by selected-period total.
- Verify the two-line value treatment at 320, 360, 390, and 430 px.

Exit gate: every visible average can be reconciled with the complete calendar
months in the selected range.

#### R2. Category Detail Vertical Slice

Dependencies: R0.

- Add a canonical category-detail route under Reports.
- Preserve category, selected range or custom dates, and analytics lens across
  navigation, refresh, browser history, and Android WebView navigation.
- Render category identity, selected-period total, average and denominator,
  calendar-month plot, partial-month indicator, and the five highest-impact
  transactions.
- Include zero-spend months so the line does not visually skip inactivity.
- Link to full transaction history with the same category, period, and
  compatible lens filters.
- Handle renamed or missing category routes with a non-destructive empty/not
  found state; no category-ID migration is part of this initiative.

Exit gate: the same internal route and calculations work in hosted web and the
bundled Android build without native financial logic.

#### R3. Calendar-Month Spending Pace

Dependencies: R0.

- Replace seven-day, twenty-eight-day, and ninety-day calculations with the
  approved complete-calendar-month baseline.
- Present monthly pace as the primary value and daily/weekly equivalents as
  secondary views of the same baseline.
- Replace the Day/Week/Month trend selector with actual monthly totals plus an
  up-to-three-month average line.
- End standard pace histories on the last completed month.
- For custom ranges, include only fully enclosed completed months.
- Show an explicit insufficient-history state instead of silently treating
  pre-ledger months as zero.
- Ensure reimbursements and all three analytics lenses match the rest of
  Reports.

Exit gate: inserting a monthly recurring expense on different days within the
same calendar month does not change that month's pace result.

#### R4. Shared Release Verification And Documentation

Dependencies: R1, R2, R3.

- Run `npm run test:regression`.
- Add route, category-average, detail, lens, reimbursement, empty-state, and
  Spending Pace React regressions.
- Add Playwright coverage for category row → detail → filtered transactions,
  browser back/forward, responsive layout, keyboard access, and light/dark
  rendering.
- Run the Android debug asset build and a bundled-WebView route smoke test.
- Verify chart information is available without hover, tooltips have accessible
  equivalents, focus order remains logical, and reduced motion is respected.
- Update the project brief, discovery documents, feature specification,
  testing strategy, and `CHANGELOG.md` to implemented truth.

Exit gate: shared web and Android behavior is verified, documentation describes
the shipped formulas, and no data migration or rollback action is required.

### Cross-Cutting Requirements

#### Privacy, GDPR, Security, And AI Governance

- Personal data touched: existing local transaction amount, date, category,
  title, reporting class, and reporting note when already displayed by
  transaction surfaces.
- Processing purpose and storage do not change; reports remain deterministic
  local derivations of the canonical ledger.
- No new collection, retention, deletion, export, transfer, subprocessor,
  remote telemetry, AI model, or automated financial advice is introduced.
- Existing authentication and authorization boundaries remain unchanged.
- No GDPR inventory, lawful-basis, transfer, subprocessor, or AI Act artifact
  change is required unless implementation expands beyond this contract.

#### Observability, Performance, And Cost

- Aggregate transactions in bounded passes using maps keyed by calendar month
  and category; do not rescan the complete ledger for every chart point.
- Reuse the existing chart dependency; do not add a visualization package.
- Errors remain within the existing client error boundary and privacy-safe
  diagnostics. Do not log transaction amounts, names, categories, or notes.
- No provider usage, backend workload, storage growth, tenant attribution, or
  usage-based cost is added; an admin cost panel is not applicable.

### Risks And Mitigations

- Partial totals and complete-month averages can look inconsistent: label the
  denominator and partial month explicitly.
- String category routes are not durable across rename: fail safely and retain
  the existing filtered-history path; category IDs remain separate scope.
- Local/UTC boundary drift can move late-night transactions between buckets:
  centralize one local-calendar boundary contract and test timezone edges.
- Sparse history can present a misleading zero baseline: begin eligible history
  with the earliest ledger month and expose the available month count.
- Large ledgers can make charts expensive: aggregate once, memoize by
  transaction set/range/lens, and cap the transaction preview at five.

### Definition Of Done

- Category ranking shows accurate selected-period totals and explicitly scoped
  complete-month averages.
- Category detail preserves scope and shows reconciliable monthly points,
  partial states, and top transactions on web and Android.
- Spending Pace uses only the approved calendar-month baseline and all displayed
  equivalents reconcile mathematically.
- Actual, Net of extras, Extras only, reimbursements, zero months, archived
  categories, partial ranges, and insufficient history are covered.
- Typecheck, unit/component tests, production build, targeted E2E, responsive
  accessibility QA, and Android bundled-route smoke verification pass.
- Documentation and changelog reflect implemented behavior.
- Rollback is a client-bundle rollback only; no schema or stored-data recovery
  is necessary.

## Planned Initiative: Android Companion And Payment Detection

Aura will add a Capacitor-based Android distribution without replacing the PWA. The first native feature is optional, local-only detection of EUR card-payment candidates from supported and user-selected notification sources.

M0 decision closure is complete for a synthetic technical spike. No real notification implementation should start until the privacy, ownership, backup, deletion, fixture, and release gates in the tracker satisfy the applicable Definition of Ready. A synthetic notification source is sufficient for the technical spike; selection of the first real payment app is a pre-pilot gate rather than a reason to guess package IDs or collect personal notifications.

The payment-detection execution source of truth is
[`11-android-payment-detection-progress-plan.md`](./11-android-payment-detection-progress-plan.md).
Whole-app publication readiness, including product scope, Play Console,
production configuration, privacy/Data Safety, account deletion, landing/store
assets, physical QA, beta, rollout and rollback, is governed by
[`13-android-production-release-plan.md`](./13-android-production-release-plan.md).
The cross-tracker execution sequence for the eight remaining readiness
priorities, including tracker reconciliation, decision closure, account
deletion, consolidated QA, supply chain, privacy/compliance, public surfaces and
controlled rollout, is maintained in
[`14-consolidated-production-readiness-plan.md`](./14-consolidated-production-readiness-plan.md).
The accepted runtime and idempotent acceptance decisions are
[`ADR 0002`](../../adr/0002-aura-android-capacitor-runtime.md) and
[`ADR 0003`](../../adr/0003-aura-payment-candidate-acceptance.md).
The approved C2 release direction and beta-only payment-detection boundary are
recorded in
[`15-c2-release-decision-pack.md`](./15-c2-release-decision-pack.md) and
[`ADR 0004`](../../adr/0004-aura-payment-detection-beta-only-release.md).

C3 now has an implemented account-deletion boundary and public entrypoint,
specified in [`account-deletion-v1.md`](../specs/account-deletion-v1.md) and
[`ADR 0005`](../../adr/0005-aura-account-deletion-orchestration.md). Remaining
release gates are allowlist/legacy retention, authorized support handling,
Firebase emulator evidence and physical Android lifecycle evidence.

Current engineering baseline:

- Node 25.1.0 and Java 21 are available;
- Capacitor 8 can run on older Android versions, but Aura deliberately supports Android 16/API 36 only in the first release;
- min/compile/target SDK are all 36;
- the Android SDK command-line toolchain and API 36 emulator are available; Android Studio is optional for the current CLI workflow and is not installed;
- Capacitor 8 and the versioned Android project are present, with bundled production assets and no remote `server.url`;
- the first-party Kotlin Credential Manager bridge compiles and is invoked on API 36; the isolated debug OAuth configuration is verified and the user reported a successful manual Google login on 2026-07-26;
- Android debug bundling fails closed without dedicated non-production Firebase/OAuth values and disables Gemini;
- a first-party runtime bridge now carries allowlisted app URLs across login and emits resume events, while browser notifications remain isolated from the Android WebView;
- repeatable API 36 verification proves bundled local origin, route reload, localStorage, IndexedDB, attachment-store persistence and deep-link delivery;
- `npm run test:regression` passes with TypeScript, 83 Vitest files/378 tests,
  and the Vite production build;
- Android unit test, lint and debug assemble pass; 34 instrumentation tests
  pass on the Pixel 9 Pro AVD with API 36, and the dedicated recovery verifier
  passes process recreation, rebind, reboot and revocation;
- M3 now provides Keystore-backed owner hashing, recoverable native purge,
  authenticated-encryption primitives, exhaustive backup/D2D exclusions,
  exact-origin WebView navigation, CSP, cleartext blocking and release R8/log
  stripping without introducing a notification listener;
- M4 now provides the system-bound notification listener, owner-scoped opt-in
  settings, finite installed-source discovery and a verified
  package-before-extras gate. The only catalog entry is a separate controlled
  synthetic test APK; real payment-app sources remain blocked;
- M5 now provides a bundled, versioned deterministic Kotlin rule engine for the
  controlled synthetic source, including negative rules, exact/review/ignored
  tiers, EUR minor-unit parsing, regex/input bounds and a synthetic corpus.
  M6 adds no source-specific production rule;
- M6 provides the private Room v1 candidate repository, encrypted payload,
  keyed technical/semantic fingerprints, owner partition, bounded retention,
  idempotent acceptance recovery, purge and WorkManager cleanup. M6 alone did
  not expose a React DTO or Aura proposal;
- M7 provides the minimized Capacitor contract, candidate/settings/acceptance
  APIs, full refresh orchestration, opaque deep-link handoff, and a private
  redacted Aura notification with immutable Verify/Ignore actions;
- M8 provides the separate React provider, disclosure/setup controls, local
  review queue, editable review, notification-center integration and verified
  idempotent commit into canonical `AppData`. Pending candidates remain outside
  the ledger, cloud and archives;
- M9 repaired stale Playwright fixture and theme-route assumptions; all 31
  Chromium, WebKit, mobile and PWA cases pass;
- M9 release hardening now requires external upload-key configuration, verifies
  the exact production package/client boundary and fails closed while the local
  Google Services file is debug-only. The production dependency audit remains
  non-green: the 2026-08-03 baseline reports 6 vulnerabilities (3 high,
  2 moderate, 1 low), pending remediation or explicit risk acceptance.
- M9 engineering hardening now also verifies Keystore invalidation, closed
  database failure, listener recovery after process/rebind/reboot/revocation,
  and structural absence of network/analytics/content logs in the detection
  path. M10 pilot operations are documented but remain blocked on the external
  M9 gates.

Current delivery decision: **M0 and the synthetic M4-M8 slices are complete;
M1-M3 remain open on their documented production, lifecycle, physical and
governance gates. M9 engineering hardening is complete but blocked on physical
QA and compliance closure. M10 operating preparation is complete but the pilot
has not started. Production signing and external privacy/DPIA gates
remain open, so Aura is not authorized to read real financial notifications or
begin a user pilot**.

Production promotion must additionally satisfy the program gates in
[`13-android-production-release-plan.md`](./13-android-production-release-plan.md).
That program treats completion of the deterministic import tracker, removal of
the client Gemini runtime, complete in-app/web account deletion, whole-app
privacy and Data Safety approval, public legal/support surfaces, Play-installed
physical QA and staged rollback acceptance as release blockers.

## Current Initiative: Aura Portable Archive V1

Aura Portable Archive V1 will add one versioned `.aura` file for complete, local-only disaster recovery while preserving transaction CSV as a separate interoperability feature.

The initiative is recovery-complete from V1: canonical app data, referenced attachments, notification preferences, custom reminders, and appearance preference are in scope. Restore is replace-only, passphrase protection is selected by default, archive processing never enters the AI-assisted import path, and cross-storage replacement uses staging, safety protection, a restore journal, and persisted read-back verification.

Task-level milestones, dependencies, tests, privacy/security work, resource limits, risks, progress updates, and done criteria are tracked in [`10-portable-archive-progress-plan.md`](./10-portable-archive-progress-plan.md). M0-M6 implementation is complete. Automated M7 browser hardening is complete; M7-M8 release closure remains conditional on physical-device/PWA, manual screen-reader, and mobile-memory verification plus resolution of the documented privacy-governance baseline gap.

User-facing behavior is specified in [`docs/specs/portable-archive-v1.md`](../specs/portable-archive-v1.md). Deployment, rollback, recovery, and privacy-safe diagnostics are defined in [`docs/03-operations/portable-archive-runbook.md`](../03-operations/portable-archive-runbook.md).

## Current Implementation Slice

- Simplify the primary shell to `Home | Transactions | Add | Budgets | Reports`, with five equally spaced slots and Add at the center; keep More as a secondary tools/settings area reached from a fixed `…` action in every header.
- Consolidate Insights, Compare, and Year Review into one Reports area.
- Consolidate Calendar and Recurring into one Planning area with a shared recurring form.
- Simplify Home, Transactions, Budgets, and More through clearer screen ownership; use progressive disclosure for optional Add Transaction fields while keeping required fields and recurring notices visible.
- Keep Actual as the default lens with a minimal Home/Budgets control and a complete Reports control.
- Reduce decorative surface effects while preserving semantic hierarchy, theme parity, and accessibility.
- Apply one inverse focal financial summary at most per screen, keep standard light surfaces white, and reserve solid primary blue for actions and selected controls.
- Keep the existing bottom navigation and TopBar information architecture unchanged during the color-hierarchy refinement.
- Track task-level progress, dependencies, quality gates, and risks in [`08-ux-simplification-progress-plan.md`](./08-ux-simplification-progress-plan.md).
- Keep the initiative local-first: no new backend, provider, AI workflow, subprocessor, or admin access to personal financial data.
- Keep financial comparison semantics explicit: expense change, net cash-flow change, account opening balances, and scheduled-versus-remaining recurring totals must not be reused as interchangeable metrics.

## Quality Gates

- Typecheck with `npm run lint`.
- Unit tests with `npm run test`.
- Production build with `npm run build`.
- Real-browser encrypted export → wipe → import → replace → reload comparison on supported desktop/mobile and installed-PWA targets.
- Keyboard, screen-reader-label, reduced-motion, light/dark, and 320/360/390/430 px checks.

## Portable Archive Release Readiness — 2026-07-23

- Automated gate: `npm run test:regression` passed end to end; TypeScript, all 273 Vitest tests across 48 files, and production build are green.
- Configuration/migrations: no runtime environment variable, backend migration, provider, or production dependency was added. Playwright is a development-only dependency; the client introduces only local archive/journal/staging keys.
- Compatibility: transaction CSV remains readable; the old two-download CSV action is replaced by one explicitly transaction-only CSV; `.aura` is classified before spreadsheet/Gemini processing.
- Rollback: revert the client bundle only after active V1 restore journals are resolved; keep a recovery-capable bundle available for affected clients.
- Privacy/cost: archive processing is local-only; no new subprocessor, transfer, AI call, hosted storage, or usage-based cost is introduced.
- Automated hardening: encrypted/plaintext round trips, fresh salt/IV, wrong password, tampering, large fixture, local-only preflight, AI isolation, safety-copy refusal, empty/non-empty restore, quota/write failure, rollback, resume, and object-URL revocation are covered.
- Release decision: **not ready for general release** until physical-device/installed-PWA, manual screen-reader, approximately 32 MiB mobile-memory acceptance, and privacy-owner governance confirmation are recorded.
- Automated Chromium/WebKit, mobile viewport, restore-checkpoint reload, PWA shell, responsive, keyboard, reduced-motion, and axe QA is complete. Physical mobile/PWA, manual screen-reader, and approximately 32 MiB least-capable-device evidence remain pending.
- Browser automation uses a synthetic non-admin identity through loopback-only `npm run dev:e2e`; the bypass cannot be enabled by runtime data and `vite build --mode=e2e` is rejected. All 29 Playwright project cases pass, including exact encrypted export → deletion → restore equivalence, rejection safety, non-empty safety-copy replacement, and all 11 restore-journal statuses.
- The execution-ready browser/PWA checklist is [`docs/07-qa/portable-archive-browser-acceptance.md`](../07-qa/portable-archive-browser-acceptance.md).

## UX Simplification Release Readiness — 2026-07-21

- Automated gate: typecheck, 220 tests across 33 files, production build, and diff validation pass.
- Configuration and migrations: none. The release changes client UI composition and session-only lens state; it introduces no environment variables, storage migrations, backend jobs, or provider dependencies.
- Compatibility: legacy report, planning, and transaction routes remain valid aliases.
- Rollback: revert the client bundle to the previous release; no data rollback is required because financial schemas and persistence semantics are unchanged.
- Post-release watch: client error-boundary events, navigation/deep-link failures, PWA install availability, and user reports about narrow-width clipping or theme contrast.
- Remaining release gate: manual verification at baseline widths in light/dark mode, keyboard navigation, reduced motion, and screen-reader labels when a controllable browser is available.
- Known non-blocking build warning: the existing large bundles and mixed static/dynamic PapaParse import remain unchanged in architectural scope and should be addressed in a dedicated performance slice.

## Privacy And Security Checks

- Financial data remains local unless cloud backup is explicitly enabled.
- Cloud backup payload is encrypted before Firestore write.
- Admin scope remains access allowlist management, not financial data access.
- No AI provider or model dependency remains in application scope.
- Search indexes are computed in memory from local state and are not sent to any service.
- Compare and year-review reports are computed locally from local transactions.
- Notifications and reminders are stored locally and use browser notification permission; no Firebase Cloud Messaging or backend scheduler is introduced.
- The mobile PWA install button does not store install, device, or usage state and does not send any data to a service.
- No new subprocessors or cross-device transfers are introduced by the feature set.
- The account-field compatibility migration runs locally during model normalization and does not introduce new personal data, retention, export, vendor, or transfer behavior.

## Feature Delivery Slices

The current UX simplification milestones M0-M9 are defined and tracked in [`08-ux-simplification-progress-plan.md`](./08-ux-simplification-progress-plan.md). The list below records the previous delivered feature baseline that the redesign must preserve.

1. Visual and navigation foundations: accent tokens, dark container tuning, `/compare`, `/year-review`, TopBar search and notification entrypoints.
2. Global search: pure search domain, local recent searches, command palette, keyboard shortcut.
3. Compare periods: pure finance comparison functions, route, charts, category deltas, insights.
4. Year in review: annual finance calculations, summary, trend chart, heatmap, category shifts, share text.
5. Local notifications: typed preferences/reminders/records, scheduler hook, profile preferences, notification center, service worker message/click handling.
6. UX quality pass: contextual TopBar back navigation, consistent empty states, undo toasts for destructive actions, haptics, pull-to-refresh feedback, reduced-motion support, focus trap baseline, and ARIA fixes.
7. Advanced UX pass: swipe-to-action transaction rows, batch selection with category change/export/delete, edge swipe navigation between primary pages, and desktop shortcuts. The former inline quick-edit sheet was later consolidated into the shared `/edit/:id` form to keep create and edit behavior consistent.
8. Visual design pass: accent color tokens, typography tokens, stronger dark-mode containers, category icon theme configuration, animated counters, sparklines, radial safe-to-spend gauge, and replacement of hardcoded chart accents in new/updated surfaces.
9. Mobile PWA install action: browser install event handling, iOS manual add-to-home-screen guidance, standalone suppression, and later relocation from the header to More.
10. Verification and documentation sync: typecheck, unit tests, production build, strategy and delivery docs.

## Implemented, Release-Gated Initiative: Deterministic Transaction Import V1

The implemented flow replaces the former generic Gemini-assisted CSV/XLSX
wizard with a local-only import using fixed `date`, `description`, and `amount`
columns. It provides deterministic validation, review, manual batch category
assignment, conservative same-description propagation, duplicate warnings,
verified persistence, and post-import correction of `Uncategorized` rows.

The initiative preserves the canonical `Transaction` and `AppData` schemas,
keeps `.aura` and Aura CSV legacy classification separate. The local path is
complete and the runtime Gemini dependency and related client/admin
configuration are removed. No automatic duplicate deletion, persistent
merchant-category rule, arbitrary column mapping, AI categorization, backend,
provider or admin visibility is included in V1.

M0 product decisions, file/resource contract, typed issues, fixture corpus,
verified commit protocol and architecture/privacy/UX/test reviews are complete.
TypeScript, 18/18 targeted import tests and the production build pass. The full
baseline initially exposed two pre-existing regressions in Insights range
anchoring and random recurring IDs during archive normalization. Both root
causes are corrected with targeted coverage, historical recurring IDs remain
unchanged, and the repeated full regression passes 87 files and 411/411 tests.
M1-M5 are complete. M5 removes the Google GenAI dependency/runtime, client-key
configuration and admin surfaces, synchronizes clean Android web assets, and
adds structural/cache/artifact-retirement gates. The current baseline is
482/482 Vitest tests, a production build, a clean Gemini artifact scan, Android
unit/lint and 34/34 API 36 instrumentation tests. The C1 full Playwright run is
47/48 because one guided-tour geometry assertion failed intermittently and then
passed 2/2 in a targeted Chromium rerun. Manual Android picker, screen-reader
and final release evidence remain in M6-M7. The dated baseline is
[`c1-baseline-2026-08-04.md`](../07-qa/c1-baseline-2026-08-04.md).
Milestones M0-M7, dependencies, quality gates,
privacy/security work, AI retirement, FinOps assessment, rollback and done
criteria are maintained in
[`12-deterministic-transaction-import-progress-plan.md`](./12-deterministic-transaction-import-progress-plan.md).

## Follow-Up Candidates

- Migrate categories from string names to stable IDs with archived metadata.
- Extend the portable archive's strict validation approach to general LocalStorage and CSV inputs after the V1 archive path is complete.
- Improve PWA offline behavior and update/install lifecycle.
- Add user-facing export for report summaries.
- Add PNG export for year-in-review if report sharing needs visual output.
