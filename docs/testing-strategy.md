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

## Planned Deterministic Transaction Import V1 Coverage

The approved local CSV/XLSX replacement has completed M0 and M1. M1 introduces
the typed local reader, validation and template builders without yet replacing
the visible wizard. Its behavioral contract is
[`deterministic-transaction-import-v1.md`](./specs/deterministic-transaction-import-v1.md),
and its synthetic M0 corpus is under `tests/fixtures/import/`.

M0 closed from a green baseline of 411 tests across 87 files. M1 adds 29 tests
for pure validation, fixture-backed CSV classification, XLSX central-directory
preflight, formulas, merged cells, worksheet states, exact row and size limits,
UTF-8/syntax rejection, archive/legacy isolation and local template generation.
The M1 baseline is 440/440 tests across 90 files with TypeScript and production
build passing.

M2 adds 19 domain/service tests for versioned Unicode description matching,
branded and independent duplicate keys, batch/ledger collisions, bounded
20,000-row duplicate metadata, deterministic ledger fingerprints, review
summaries, separate include/select state, category scopes, inactive-category
revalidation, delta undo, UUID collision retry and canonical transaction
mapping. The M2 baseline is 459/459 tests across 94 files with TypeScript and
production build passing.

M3 adds 11 React tests for local upload copy, template downloads, safe
validation messages, five-step loading/review/confirmation/success behavior,
archive isolation, session-close warning, category scopes, distinct
include/select controls, undo, warnings, empty filters and 100-row pagination.
The M3 baseline is 470/470 tests across 97 files with TypeScript and production
build passing. Browser-level narrow-width, theme, axe and screen-reader
acceptance remains part of M6 hardening.

M4 adds 12 Vitest cases across the verified bulk service, reducer and history
components. They inject stale-ledger, UUID exhaustion, write/quota,
read-back-mismatch and rollback-failure paths; cover selective import undo and
per-ID category undo; and assert that non-category fields and unrelated rows
survive batch correction. The baseline is 482/482 tests across 99 files with
TypeScript and the production build passing.

M4 also establishes the first mandatory import Playwright gate. Its Chromium
happy path covers template CSV, upload, same-description categorization,
verified commit, reload, the `Uncategorized` history handoff, batch correction,
absence of AI-provider calls and absence of imported values in request payloads.
A negative
case proves invalid headers never reach review or mutate the ledger. M6 must
extend this suite to XLSX, remaining failure states, network interception,
cross-browser/mobile/accessibility and Android bundled-WebView coverage; M4's
two E2E cases remain part of every later full acceptance run.

M5 removes obsolete provider-categorizer tests together with their production
runtime and adds four retirement tests for import dependency isolation, deleted
provider/config/admin modules, exact cache-namespace cleanup, storage failure
and Android environment shape. The post-retirement baseline is 472/472 Vitest
tests across 100 files. `test:regression` now also scans production web and
synchronized Android assets for the removed SDK, client key, endpoints, model
IDs and admin CTA. The two Chromium import E2E remain green after retirement.

M6 adds formula-safe transaction CSV export tests and browser acceptance for
CSV/XLSX, invalid rows and headers, file limits, duplicate decisions,
close/reopen, injected persistence failure, archive/legacy isolation, reload,
batch correction and absence of import-specific external requests. The quality matrix runs on
Chromium, WebKit, Pixel 5 and iPhone 13 emulation, checks 320/360/390/430 px,
light/dark, reduced motion, focus containment and Axe serious/critical results,
and validates 20,000 rows with a 100-row bounded DOM. The PWA project verifies
the template download path. Repeatable evidence and remaining physical
Android/screen-reader gates are recorded in
[`deterministic-transaction-import-m6-acceptance.md`](./07-qa/deterministic-transaction-import-m6-acceptance.md).

The authenticated Android bundled-WebView gate runs on a Pixel 9 Pro API 36
Play Store image. It rebuilds isolated debug assets before installation and
validates the 20,000-row CSV boundary, 100-row DOM cap, 200-page result and
CSV/XLSX upload surface. This closes the automated WebView performance gate;
the native Android document-picker interaction and manual screen-reader pass
remain physical/manual acceptance items. The final M6 regression baseline is
482/482 Vitest tests across 102 files plus 17/17 import Playwright tests.

Implementation must travel with coverage at four layers:

- data/domain tests for file classification, CSV dialects, XLSX ZIP preflight,
  limits, typed issues, signed cents, calendar dates, description matching,
  duplicate warnings and canonical mapping;
- service/state tests for ledger-fingerprint drift, transaction-only strict
  persistence, exact read-back, rollback failure injection, session undo and
  per-ID category undo;
- React tests for paginated review, distinct include/select states, filters,
  same-description scope, Uncategorized confirmation, duplicate decisions,
  close warning and every loading/empty/error/success state;
- Playwright and Android bundled-WebView coverage for CSV/XLSX happy paths,
  reload equivalence, history correction, template download, `.aura`/legacy CSV
  isolation, accessibility and absence of network requests.

Security regressions must prove that formula cells are rejected, imported text
is rendered as text, later CSV export formula-escapes every string field, and
no financial value or filename enters logs or test artifacts. Large fixtures
are generated at runtime at the exact declared boundaries; real bank exports
and personal data are prohibited.

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

## Category Reports And Calendar-Month Spending Pace

The shared web/Android reporting implementation is protected at three levels:

- domain tests cover local calendar boundaries, leap years, complete and
  partial months, sparse/zero history, reimbursements, archived categories,
  transaction ranking, all analytics lenses, and the monthly-to-weekly/daily
  reconciliation formula;
- React tests cover category ranking averages, category drill-down routing,
  persisted period/lens scope, partial labels, top transactions, filtered
  history, missing categories, and populated or insufficient Spending Pace;
- release verification runs `npm run test:regression`, Android
  `testDebugUnitTest`, Android asset synchronization, `assembleDebug`, all 34
  API 36 instrumentation tests, plus real-browser responsive checks at 390 px
  and 320 px.

Browser fixtures are supplementary. Financial correctness remains asserted
against deterministic domain and component fixtures so local browser data
cannot mask a regression.
