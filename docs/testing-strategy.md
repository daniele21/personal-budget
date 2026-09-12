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

- transactional newest-first rotation capped at five encrypted version documents;
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

The Playwright suite runs the bundled React runtime across desktop Chromium,
desktop WebKit and Pixel 5/iPhone 13 emulation. Its recovery journeys include:

- synthetic non-admin authentication without a login prompt;
- encrypted export through the real browser download flow;
- exact export → local deletion → import → restore → reload equivalence;
- wrong-passphrase rejection with unchanged current data;
- tampered-archive rejection with unchanged current data;
- mandatory safety-copy download before replacing a non-empty workspace.

The recovery comparison reads every canonical AppData section, portable notification/appearance preferences, custom reminders, and the referenced IndexedDB receipt. Additional browser tests reload from all 11 restore-journal statuses; exercise 320/360/390/430 px layouts; scan light/dark archive surfaces with axe; verify focus trapping/restoration and reduced motion; record bounded typical-workspace resource evidence; and verify that retired manifest, install and service-worker behavior is absent. Playwright retains trace, screenshot, and video evidence on failure.

Physical Android-device WebView execution, manual TalkBack output, lock-screen
notification review and the approximately 32 MiB least-capable-mobile
measurement remain manual release gates. Browser mobile emulation is a React
runtime regression harness, not a supported distribution channel.

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

The guided-tour browser journey verifies the bounded contextual tour catalog.
It checks:

- a maximum of four steps and stable targets within the selected module;
- successful target discovery after lazy route rendering;
- automatic spotlight tracking and an explanation panel that does not overlap
  the highlighted viewport region;
- absence of automatic startup during first-run;
- completion persistence and manual replay/skip behavior.

Pure layout tests also cover top, bottom, and oversized-target positioning on
mobile viewport dimensions.

Retired-PWA coverage verifies absence of manifest/install affordances and active
service-worker registrations. A best-effort startup migration unregisters old
Aura registrations and removes only caches with the retired
`aura-finance-` prefix.

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

## Transaction Import Coverage

Deterministic Transaction Import V1 is implemented and remains the canonical fast path for files matching the fixed `date,description,amount` contract. Its behavioral contract is [`deterministic-transaction-import-v1.md`](./specs/deterministic-transaction-import-v1.md), its M6 acceptance record is [`deterministic-transaction-import-m6-acceptance.md`](./07-qa/deterministic-transaction-import-m6-acceptance.md), and synthetic fixtures live under `tests/fixtures/import/`.

V1 coverage spans four layers:

- data/domain tests for file classification, CSV dialects, XLSX ZIP preflight, formulas/merged cells, exact resource limits, typed issues, signed cents, calendar dates, normalized-description matching, duplicate warnings and canonical mapping;
- service/state tests for ledger-fingerprint drift, transaction-only strict persistence, exact read-back, rollback failure injection, session undo and per-ID category undo;
- React tests for paginated review, distinct include/select states, filters, same-description scope, `Uncategorized` confirmation, duplicate decisions, close warning and loading/empty/error/success states;
- Playwright and packaged Android WebView coverage for CSV/XLSX happy paths, invalid files/rows, 20,000-row bounded rendering, reload equivalence, history correction, template download, `.aura`/legacy CSV isolation, accessibility and absence of import-specific network requests.

Security regressions prove that formula cells are rejected, imported text is rendered as text, later CSV export formula-escapes every string field, and no fixture financial value or filename enters import telemetry. Large fixtures are generated at runtime at the declared boundaries; real bank exports and personal data are prohibited.

Harnex-assisted Transaction Import V2 extends V1 rather than replacing it. Unit/domain/service coverage additionally verifies generic spreadsheet profiling, bounded Aura-generated date/amount/header candidates, unknown/duplicate candidate rejection, schema response validation, history-first category resolution, active-category ID validation, sequential input-budget batching, cancellation, partial failure, manual fallback and cleanup. Component/state tests cover explicit mapping confirmation, unavailable/unauthorized recovery, progress, cancellation and review-safe continuation; Harnex-specific status surfaces use alert/live/busy/progress semantics and non-color-only copy.

Browser E2E exercises the arbitrary-header flow through the Harnex-unavailable/manual path and intercepts external requests so import fixture data cannot escape. The browser-only synthetic auth bypass remains serve-only and cannot be built into a deployable bundle.

Strong/FULL Android integration uses the repository-owned two-APK lane against an exact Harnex candidate. It must prove, with synthetic data only:

- host absent fails closed;
- Aura caller authorization/assignment/readiness and model-profile transitions behave correctly;
- schema and category generation run through the typed Consumer lifecycle;
- cancellation, cleanup and reconnect/restart preserve the ownership contract;
- the packaged arbitrary-header G2 obtains schema/category assistance, requires explicit mapping, performs Aura deterministic extraction, keeps the ledger unchanged before Review, and commits only through the verified transaction path;
- imported canonical transactions contain no Harnex/import provenance;
- material Android UI journeys produce the `.engineering/e2e.json`-required `FULL_MEDIA` evidence.

The packaged Android CI shell authenticates with the real Firebase Web SDK against process-local Auth/Firestore emulators using a synthetic `.invalid` identity. It does not package the browser E2E auth bypass. Debug cleartext support for that lane is bounded to the emulator-hosted Firebase endpoints; ordinary debug and release network policy remain unchanged.

Automated browser/emulator evidence is integration proof, not physical-device proof. Representative ARM64/JNI/GGUF model quality and performance, thermal/memory/OEM behavior, physical Google/Credential Manager sign-in, production signer/authorization topology, TalkBack/text scaling and other release-specific real-environment evidence remain release gates when required by the release claim.

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
