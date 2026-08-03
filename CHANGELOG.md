# Changelog

## Unreleased

### Added

- Added the M1 deterministic transaction-import foundation: local incremental
  CSV parsing, bounded XLSX ZIP preflight, typed structural validation, strict
  archive/legacy/V1 classification, and matching CSV/XLSX template builders.
  File content remains in memory and this slice performs no network or ledger
  mutation.
- Added the M2 in-memory import-review domain: versioned exact-description
  groups, independently keyed batch/ledger duplicate warnings, deterministic
  ledger fingerprints, review summaries, active-category validation, delta
  undo, and collision-safe canonical transaction mapping.
- Replaced the visible Gemini-assisted import wizard with the M3 local five-step
  CSV/XLSX flow, including templates, typed validation feedback, 100-row
  pagination, separate inclusion/batch selection, disclosed category scopes,
  duplicate and future-date warnings, session undo and Uncategorized
  confirmation.
- Added M4 verified transaction-only import persistence with strict read-back,
  rollback on write/read mismatch, collision-safe IDs, session-only selective
  undo, an `Uncategorized` history handoff, and atomic per-ID batch category
  correction with undo. Added Chromium E2E coverage for the complete
  import/reload/correction journey and invalid-header ledger isolation.
- Retired the Gemini transaction-import runtime: removed the Google GenAI SDK,
  provider prompts/configuration, client API-key variable, Firestore usage
  client, admin model/usage panels and obsolete categorizer tests. Added a
  scoped best-effort cleanup for the exact V6 legacy import-cache namespace,
  structural isolation tests, and web/Android artifact scanning. Historical
  Firestore documents were not deleted or mutated.
- Hardened deterministic transaction import with formula-safe CSV export,
  browser tests for remaining validation/rollback/archive/legacy paths,
  external-request interception, 20,000-row bounded rendering, responsive
  light/dark accessibility checks across Chromium/WebKit/mobile emulation, PWA
  template coverage, and verified Android debug build/JVM/lint gates. Physical
  Android WebView and manual screen-reader acceptance remain release-blocking.
- Fixed Android debug build isolation so instrumentation and WebView commands
  always synchronize non-production Firebase assets before compiling or
  installing an APK, preventing mixed debug OAuth/production Firebase bundles.
  Added a Pixel 9 Pro API 36 authenticated 20,000-row WebView probe and removed
  a sequential wizard transition that could leave completed validation hidden
  behind an indefinite loading state.
- Added a Google Wallet engineering connector using finite package visibility,
  an anchored merchant-title/EUR-payment template, negative-rule priority, and
  a synthetic/redacted corpus. Card labels and masked suffixes are matched only
  as delimiters and are never captured or persisted.
- Added the first real-source engineering connector for Intesa Sanpaolo Mobile
  using finite package visibility, anchored physical/virtual card-payment
  templates, negative-rule priority, and an entirely synthetic/redacted test
  corpus. Masked card/account identifiers are neither captured nor persisted;
  production rollout remains behind the documented privacy and pilot gates.
- Added a macOS Keychain-backed Android release helper that retrieves the
  upload-keystore password without exposing it in repository files, command
  arguments, shell history, or build output.
- Added a category report shared by the hosted PWA and Android bundle, with a
  calendar-month spending plot, explicit partial-month state, top transaction
  impacts, and scope-preserving navigation to filtered history.
- Added complete-calendar-month averages to category ranking rows while keeping
  selected-period totals inclusive of partial months.
- Added the Capacitor 8 Android foundation for Aura with a versioned native
  project, bundled web assets, Android 16/API 36 baseline, isolated debug
  application ID, backup exclusions, and reproducible JDK 21 Gradle commands.
- Added explicit web/native capability detection so the Android shell does not
  register the PWA service worker or expose browser install prompts. The
  payment-notification capability remains unavailable to the PWA.
- Added a first-party Kotlin Credential Manager bridge for Android Google
  sign-in. Google ID tokens remain in memory and are exchanged through the
  existing Firebase JS session; no third-party auth plugin was introduced.
- Added a fail-closed Android debug build profile requiring dedicated
  non-production Firebase/OAuth values and disabling Gemini in debug bundles.
- Added privacy-safe Android authentication diagnostics for debuggable builds,
  with explicit failure stages and bounded error codes but no exception
  messages, tokens, client IDs, emails, credentials, or Firebase profiles.
- Moved the Credential Manager Web client ID lookup to the Android resource
  generated by `google-services.json`, removing it from Capacitor bridge calls.
- Added a first-party Android runtime bridge for resume and allowlisted app
  URLs, retaining navigation targets across authentication without placing
  financial values in the URL.
- Added a shared notification delivery boundary that preserves browser
  notifications on the PWA and prevents browser Notification API use inside
  the Android WebView.
- Added repeatable API 36 WebView and instrumentation verification for bundled
  origin, route reload, localStorage, IndexedDB, attachment persistence,
  isolated debug package, backup flag, and deep-link delivery.
- Added the Android M3 privacy/security foundation: Keystore-backed owner
  hashing, recoverable purge on logout/account change/reset/deletion,
  AES-GCM candidate-field primitives with authenticated owner/ID/schema
  context, and cryptographically opaque candidate IDs.
- Added exact-origin WebView navigation, restrictive web/hosting CSP,
  cleartext blocking, exhaustive Android cloud-backup/device-transfer
  exclusions, release R8/resource shrinking and production Android log
  stripping.
- Added M3 threat model, data-flow/lifecycle documentation and API 36
  instrumentation coverage for owner isolation, purge, encryption, component
  exposure, effective backup flag and cleartext policy.
- Added the M4 Android notification-listener foundation with separate
  user-requested and OS-granted state, owner-scoped selected-source settings,
  finite package visibility, settings navigation fallback and
  `POST_NOTIFICATIONS` handling.
- Added a package-before-extras gate that defers bounded title/text/bigText
  extraction to a background executor and returns without touching extras for
  unsupported or unselected packages.
- Added a separate signature-protected synthetic notification APK and API 36
  end-to-end instrumentation test. No real payment-app identifier, fixture,
  parser, candidate persistence or off-device transfer was introduced.
- Added an emulator-only `android:simulate:wallet-notification` command with a
  static Italian Wallet-like fixture, bounded display duration, multi-emulator
  selection, interrupt-safe cleanup, listener revocation and automatic removal
  of the synthetic source APK.
- Added a dedicated-emulator M4 recovery verifier covering forced process
  recreation, listener rebind, Android 16/API 36 reboot, post-reboot detection,
  revocation, and idempotent cleanup using only redacted counters.
- Added the M5 bundled deterministic Kotlin rule engine and synthetic fixture
  corpus with bounded NFKC normalization, EUR minor-unit parsing, absolute
  negative-rule priority, `exact`/`review`/`ignored` tiers, regex safety checks,
  hostile-input coverage, identifier exclusion, and a 10,000-parse benchmark.
  Raw notification strings remain in memory only; no candidate database,
  bridge DTO, Aura proposal, real payment-app identifier, or network path was
  introduced.
- Added the M6 private Room v1 candidate repository with AES-GCM encrypted
  structured payloads, owner-scoped keyed fingerprints, technical upsert,
  conservative cross-source deduplication, bounded retention/tombstones,
  idempotent acceptance reservation and recovery, device-local purge, and
  startup/resume plus WorkManager cleanup. Migration, concurrency, retention,
  owner-isolation and purge coverage passes on the Pixel 9 Pro API 36 AVD; the
  M6 slice remains synthetic-only and did not itself emit an Aura proposal.
- Added the M7 minimized Capacitor bridge for candidate, settings, and
  acceptance operations, with bounded argument validation and no raw
  notification, package, rule, fingerprint, or secret fields in normal
  candidate snapshots.
- Added cold-start/resume reconciliation, optional local candidate-change
  hints, opaque candidate deep-link handoff across authentication, and a
  private Aura notification with redacted private/public content, immutable
  Verify/Ignore actions, and a non-exported Ignore receiver.
- Added the M8 Android-only payment-detection workspace with prominent access
  disclosure, supported-source controls, pending backlog, editable review,
  Ignore/delete actions, notification-center integration, and PWA unsupported
  state.
- Added verified idempotent candidate acceptance: native reserves the
  transaction UUID, React persists and reads back a normal transaction through
  canonical `AppData`, and native completes or recovers candidate cleanup only
  afterward. Pending candidates and detection metadata remain outside
  transaction, archive, cloud, Gemini, analytics, and network paths.

### Changed

- Consolidated the Aura Brand Kit v2 into an implementation contract for
  semantic color tokens, Manrope/Inter roles, English interface copy, Lucide
  iconography, restrained motion, and canonical square logo assets. Shared
  surfaces now reuse the light/dark elevation scale and automated policy tests
  guard against raw palette literals in React UI.
- Consolidated detected-payment review and manual transaction entry onto one
  shared transaction editor. The Android proposal now opens as a full-screen,
  prefilled Add Transaction flow with the same amount keypad, category picker,
  date, treatment, payment options, validation, and save hierarchy while
  preserving atomic candidate acceptance.
- Changed the default Categories reporting period to 12 months, including
  category details opened without an explicit range, while preserving any
  period the user already selected.
- Reworked Spending Pace around one up-to-three-complete-month baseline, with
  monthly pace as the primary value and mathematically reconciled weekly and
  daily equivalents. The trend now compares actual calendar-month spending
  with that moving monthly baseline.
- Added `staituned.owner@gmail.com` as a second designated administrator
  alongside the existing administrator, centralizing application checks and
  routing all privileged Firestore rules through one shared rule helper.
- Consolidated every transaction edit entry point onto the same prefilled form
  used by Add Transaction, removing the divergent quick-edit dialog from Home,
  History, swipe actions, and Calendar.
- Expanded the guided tour from a route-level overview to a 27-step operating
  journey across Home, transaction entry, history, budgets, reports, global
  tools, and planning. Each step now auto-scrolls to a stable feature region,
  tracks it during motion, and moves the explanation above or below the
  spotlight without obscuring it on mobile viewports. Route changes now
  spotlight the selected destination control instead of showing an “Opening”
  card; the current primary navigation item remains highlighted throughout the
  tour, while Reports/Planning tabs are highlighted during handoff and their
  dedicated steps. Step motion is limited to a subtle fade.
- Removed the duplicate clickable “Private by design” callout from More; Data &
  Privacy now has one unambiguous entry point in the tools list.
- Added a one-time browser-local PWA install dialog after the authenticated
  first-access setup, with a native Chromium install action, Safari instructions
  on iOS, and persistent retry actions in the top bar and under More.
- Cloud backup now retains the latest three timestamped encrypted versions per
  user, rotates them transactionally across devices, and lets the user select
  the exact version to restore from onboarding or Data & Privacy.
- Added a local-only synthetic authentication adapter and a 29-case Playwright matrix covering Chromium, WebKit, mobile emulation, encrypted export/deletion/restore equivalence, rejection safety, all restore-journal reload states, accessibility/responsive behavior, bounded resource evidence, and PWA shell registration; the non-admin bypass is loopback-only and cannot be built or deployed.
- Made Add Transaction more compact by grouping type with amount, placing essential fields in one dense form, keeping optional details behind `More options`, and keeping the contextual save action reachable above the bottom navigation.
- Added Aura Portable Archive V1 under Data Management: one encrypted-by-default, self-verified `.aura` export; local-only unlock and preview; safety-protected replace restore; startup recovery; and clear separation from transaction CSV and AI-assisted bank-statement import. General release remains gated on physical-device/installed-PWA, manual screen-reader, and approximately 32 MiB mobile-memory QA.

### Fixed

- Anchored Reports period presets and initial custom-range dates to the user's
  selected application month instead of the device's current month.
- Replaced random IDs for newly materialized recurring transactions with
  bounded deterministic occurrence IDs and collision handling, while
  preserving IDs already stored in historical linked transactions.
- Replaced empty profile-photo sources with an accessible initial fallback and
  corrected invalid Dashboard skeleton markup, preventing broken imagery and
  React console errors in the branded application shell.
- Replaced the leftover Capacitor launcher and splash marks with Aura assets,
  added safe-area-aware PWA/Android icon variants, stopped the compact UI mark
  from cropping its non-square source with `object-cover`, and geometrically
  centered the approved mark inside every square and splash canvas.
- Kept the category picker above the full-screen detected-payment review and
  replaced the misleading automatic first-category default with an explicit,
  required category selection before saving.
- Removed the duplicate Vite Web OAuth client requirement from Android Google
  Sign-In. Android now uses the `default_web_client_id` generated from the
  variant-specific Google Services configuration, with release-readiness
  coverage for a missing Web OAuth client.
- Prevented Android release bundles from reusing stale WebView assets produced
  by the isolated debug Firebase build. Release readiness and Gradle now fail
  closed unless bundled assets contain the production project and exclude the
  debug project.
- Scoped the Android development unit-test command to the configured debug
  variant so an isolated debug-only `google-services.json` does not require an
  unavailable production OAuth client.
- Scoped Android instrumentation to the Aura app module, avoiding duplicate
  Kotlin test dependencies in generated Capacitor library modules.
- Captured Chromium’s one-shot PWA install event at application startup,
  registered the service worker immediately, and made the More install action
  invoke the native installer on supported Android and desktop browsers while
  preserving Safari instructions for iOS.
- Removed invalid remote demo-image values from transaction attachment references
  and migrated existing demo copies before strict persistence, preventing
  `attachmentUrl is too long` save failures.
- Projected extended application state onto canonical `AppData` before strict
  local persistence, preventing onboarding metadata from being rejected as an
  unsupported Archive V1 field.
- Restored keyboard focus to the invoking control when archive and confirmation dialogs close.
- Separated expense month-over-month change from net cash-flow change on Home.
- Limited the current Planning summary to recurring payments due today or later and clarified past/current/future labels.
- Made custom report ranges valid by construction and based category trend buckets on actual duration.
- Prevented Spending Pace from ending before its custom start date when the current month is included.
- Replaced the mismatched cash-flow goal with a current-versus-previous net comparison.
- Preserved immutable budget updates and initialized date inputs from the local calendar day.
- Corrected month-status copy for past, current, and future Home views.
- Defined Net Worth as account opening balances plus ledger net, with migration from legacy account `balance` data.
- Kept the selected comparison category valid when the available category set changes.
