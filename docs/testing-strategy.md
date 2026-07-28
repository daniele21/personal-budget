# Testing Strategy

## Purpose

Aura Finance handles personal financial data locally. Changes to transactions, reports, budgets, recurring entries, import/export, backup, or privacy-sensitive metadata can silently corrupt user trust if they are only checked manually.

This document defines the minimum automated test structure for meaningful changes.

## Test Layers

### Domain Tests

Use for pure financial rules and data transforms.

Examples:

- transaction totals
- analytics lenses
- budget calculations
- recurring generation and reconciliation
- category reference changes
- import classification helpers

Command:

```sh
npm run test
```

### Data Model Tests

Use for local-first persistence behavior.

Required when adding or changing persisted fields:

- legacy data without the field
- restored backup data
- generated demo data
- recurring transaction sync
- field normalization and defaulting
- rejection or explicit projection of non-domain fields from richer application state
- migration of legacy demo-only attachment URLs before strict persistence

Command:

```sh
npm run test
```

### React Component Tests

Use for user-facing flows where the UI is the contract.

Required for major changes to:

- transaction create/edit flows
- edit entry points from transaction details, history swipe actions, and calendar
- history rows and batch actions
- reports and analytics lenses
- budget summaries
- import/export UX

Command:

```sh
npm run test:react
```

### Cloud Backup Version History

Cloud-backup changes require coverage for:

- transactional newest-first rotation capped at three encrypted snapshots;
- creation timestamp, stable version ID, checksum, and read-back verification;
- listing only decryptable and structurally valid versions;
- exact selected-version restore with no silent fallback;
- automatic fallback only when the normal newest-first recovery path encounters corruption;
- version selection, date display, replacement confirmation, loading, empty, and error states.

## Regression Gate For Large Changes

Run the full regression gate before considering a major change complete:

```sh
npm run test:regression
```

This runs:

- TypeScript check
- all Vitest tests
- production build

## Local E2E Authentication Harness

Browser automation uses one synthetic, non-admin identity and never signs in to Firebase:

- command: `npm run dev:e2e`;
- local origin: `http://127.0.0.1:4173`;
- identity: `Aura E2E Test User` / `e2e-user@aura.invalid`;
- implementation: `src/e2e/useE2EAuth.ts` selected through the build-time `@auth-runtime` alias.

The bypass is fail-closed. It is available only when Vite serves in `e2e` mode, binds to loopback with a strict port, has no admin privileges, contains no Firebase credentials, and cannot be built into a deployable bundle. `vite build --mode=e2e` must fail. Normal development, test, and production modes always resolve `src/hooks/useFirebaseAuth.ts`.

E2E scenarios must load synthetic fixtures after the authenticated shell starts. They must not use real email addresses, financial data, receipts, Firebase projects, or production browser profiles.

Run the browser suite with:

```sh
npm run test:e2e
```

Run unit, component, build, and browser gates together with:

```sh
npm run test:full
```

The Playwright suite contains 31 project cases across desktop Chromium, desktop WebKit, Pixel 5/iPhone 13 emulation, and a service-worker-enabled Chromium project. Its recovery journeys include:

- synthetic non-admin authentication without a login prompt;
- encrypted export through the real browser download flow;
- exact export → local deletion → import → restore → reload equivalence;
- wrong-passphrase rejection with unchanged current data;
- tampered-archive rejection with unchanged current data;
- mandatory safety-copy download before replacing a non-empty workspace.

The recovery comparison reads every canonical AppData section, portable notification/appearance preferences, custom reminders, and the referenced IndexedDB receipt. Additional browser tests reload from all 11 restore-journal statuses; exercise 320/360/390/430 px layouts; scan light/dark archive surfaces with axe; verify focus trapping/restoration and reduced motion; record bounded typical-workspace resource evidence; and verify the production manifest/service-worker registration lifecycle. Playwright retains trace, screenshot, and video evidence on failure.

Physical-device Safari/Chrome, actual installed-PWA execution, manual screen-reader output, and the approximately 32 MiB least-capable-mobile measurement remain manual M7 release gates.

## Android Payment Detection Coverage

The opt-in Android payment-detection path requires:

- TypeScript contract, disclosure, UI-state, and native security-configuration tests;
- Android unit, lint, debug-assemble, and instrumentation gates;
- instrumentation coverage for package gating, encrypted persistence, owner isolation,
  dedupe, retention, logout/reset, Keystore invalidation, database failure, private
  notification actions, and bridge DTO validation;
- an explicit listener recovery check across process recreation, listener rebind,
  emulator reboot, and permission revocation;
- browser regression coverage for the review backlog and idempotent acceptance into
  the canonical transaction model.

Current automated evidence is 83 Vitest files/378 tests, 31 Playwright cases, and
34 Android instrumentation tests on the Pixel 9 Pro Android 16/API 36 emulator.
These checks do not replace physical stock/OEM-device testing, manual TalkBack and
lock-screen review, signed-release validation, dependency audit, or privacy,
security, and release-owner approval.

## Guided Tour Coverage

The guided-tour browser journey verifies every configured step rather than a
fixed subset of route transitions. For each step it checks:

- the expected route, heading, and stable feature target;
- successful target discovery after lazy route rendering;
- automatic spotlight tracking and an explanation panel that does not overlap
  the highlighted viewport region;
- persistent highlighting of the current primary destination, plus explicit
  Reports/Planning destination highlighting during route-transition handoffs;
- completion persistence and manual replay/skip behavior.

Pure layout tests also cover top, bottom, and oversized-target positioning on
mobile viewport dimensions.

PWA installation coverage verifies:

- stable manifest identity, root scope/start URL, standalone display, and 192/512 icons;
- immediate service-worker registration and active root scope;
- global capture of `beforeinstallprompt` before lazy route components mount;
- one-shot native prompt invocation and accepted/dismissed state handling;
- first-access dialog sequencing after initial-data selection/onboarding and
  browser-local one-time suppression after it is shown;
- browser-only top-bar install affordance backed by the same retained prompt;
- install-action suppression in standalone mode and manual Safari guidance on iOS.

## Extra Transaction Analytics Coverage

The extra transaction feature has regression coverage for:

- manual transactions saving `reportingClass` and `reportingNote`
- recurring-linked transactions not exposing or saving extra metadata
- history extra badges
- Insights `Actual`, `Net of extras`, and `Extras` lenses
- Budgets defaulting to actual spend while showing net-of-extras context
- domain-level analytics lens totals
- data-model normalization that strips stale extra markers from recurring transactions

## Portable Archive Foundation Coverage

Milestones M0-M6 of Aura Portable Archive V1 establish the format, local-data boundaries, transactional restore services, and product entrypoints. M7 real-browser hardening remains release-blocking.

Current automated coverage includes:

- strict V1 manifest, AppData, preference, attachment, and header validation;
- missing sections, invalid amounts/dates, unknown fields, duplicate IDs and recurring occurrences;
- future schema rejection and explicit identity migration routing for V1;
- enforced `migrate → validate → normalize` ordering;
- deterministic canonical JSON and SHA-256 integrity checks;
- missing, orphaned, malformed, and tampered attachment cases;
- attachment inventory, restore-scoped staging, failed-write cleanup, commit, rollback, orphan cleanup, and preservation of unrelated IndexedDB entries;
- portable preference defaults, legacy partial preference normalization, strict reminder validation, and exclusion of session/cloud flags;
- complete snapshot collection through domain, repository, and service boundaries;
- Add Transaction regression coverage after moving direct IndexedDB access into `attachmentRepository`.
- plaintext and AES-GCM encrypted codec round trips, wrong passphrase, tampering, signature rejection, size limits, cancellation, and production-reader self-verification;
- local-only preflight, encrypted unlock, restore-preview counts, and no localStorage mutation during inspection;
- binary archive classification before spreadsheet parsing, with regression proof that renamed archives invoke neither the spreadsheet parser nor Gemini;
- ordered restore-journal checkpoints, safety-copy confirmation, staged attachments, persisted read-back equivalence, quota/staging failure, injected commit failure with rollback, startup cleanup, and post-core resume;
- cloud-backup suppression while a restore journal is active and provider hydration gated behind startup recovery.
- encrypted-default export UI, plaintext acknowledgement, content counts, safety-copy confirmation/download, transaction-only CSV separation, and temporary object-URL revocation;
- empty-target replacement, declined safety download, fresh salt/IV metadata, and a 5,000-transaction codec fixture.

M7 has automated Chromium/WebKit wipe-and-restore acceptance, mobile viewport emulation, every restore-journal status through real Chromium reloads, responsive/keyboard/axe checks, and PWA shell lifecycle coverage. It must still complete physical-device browser/PWA acceptance, manual screen-reader verification, and mobile-memory measurements before the archive feature can ship.

## When To Add More Tests

Add or update tests when a change affects:

- persisted data shape
- report calculations
- budget calculations
- recurring generation
- import/export fields
- backup or restore behavior
- privacy-sensitive metadata
- user-visible financial totals

Manual QA is acceptable only as a supplement. It should not replace automated regression coverage for financial calculations or data model behavior.
