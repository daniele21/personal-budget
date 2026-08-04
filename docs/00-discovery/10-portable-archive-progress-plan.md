# Aura Portable Archive V1 Progress Plan

## Purpose

This document is the living delivery tracker for the approved Aura Portable Archive V1 initiative.

The objective is to let a user export one file and later reconstruct the complete Aura workspace after local data loss, independently from cloud backup. Transaction CSV remains a separate interoperability feature and must not be presented as disaster recovery.

Update this file whenever a task starts, completes, becomes blocked, changes scope, or produces a decision. Product rationale is recorded in [`00-project-brainstorm.md`](./00-project-brainstorm.md) and [`01-solution-strategy.md`](./01-solution-strategy.md).

## Status Legend

| Status | Meaning |
|---|---|
| `Not started` | No implementation work has begun |
| `In progress` | Work is actively underway |
| `Blocked` | Progress requires a decision or external change |
| `Done` | Code, tests, verification, and required docs are complete |

For task lists:

- `[ ]` not completed;
- `[x]` completed.

## Progress Dashboard

Last updated: 2026-08-04

| Milestone | Status | Progress note |
|---|---|---|
| M0. Contract, architecture, and baseline | Done | Binary envelope, limits, crypto policy, restore states, ADR, fixtures, and pre-change baseline recorded |
| M1. Archive domain, validation, and integrity | Done | V1 contracts, strict validators, migration routing, canonical checksums, references, and tests implemented |
| M2. Complete local-data capture | Done | Attachment repository boundary, inventory/staging/rollback, portable preferences, snapshot service, sizing, and tests complete |
| M3. Export, encryption, and self-verification | Done | Binary builder/reader, AES-GCM, limits, cancellation, typed errors, and production-reader self-verification complete |
| M4. Import preflight and restore preview | Done | Local-only inspection/unlock/preview implemented; archive signature is isolated from spreadsheet and Gemini paths |
| M5. Replace restore, journal, and recovery | Done | Safety-copy gate, staged replace, read-back verification, rollback, startup recovery, and cloud-backup suppression implemented |
| M6. Product UX and legacy-import separation | Done | Data Management entrypoints, encrypted-default export, replace confirmation, safety download, CSV/AI separation, and progress/error states implemented |
| M7. Hardening, regression, and recovery QA | In progress | 29/29 browser cases and 273/273 regressions pass; physical-device/PWA, manual screen-reader, and 32 MiB mobile-memory gates remain |
| M8. Documentation and release readiness | In progress | Spec, runbook, privacy notes, ADR, testing strategy, changelog, and not-ready release decision recorded; privacy-governance confirmation remains |

Current delivery focus: **M7 real-browser acceptance and M8 governance closure**.

C1 reconciliation: all archive cases in the 2026-08-04 automated baseline pass
inside the 482/482 regression and cross-browser/PWA runs. The unrelated guided
tour finding does not change archive behavior. Physical mobile/installed-PWA,
manual screen-reader, approximately 32 MiB least-capable-device and privacy
owner gates remain open exactly as recorded below. See
[`c1-baseline-2026-08-04.md`](../07-qa/c1-baseline-2026-08-04.md).

## Approved Decisions

### Product Promise

`Export complete Aura archive` creates one portable `.aura` file capable of reconstructing the complete supported workspace. `Export transactions CSV` remains intended for analysis or use in other software.

### V1 Archive Scope

The archive includes:

- transactions;
- budgets;
- recurring entries and overrides;
- accounts;
- active and archived categories;
- savings goals;
- monthly budget;
- notification preferences;
- custom reminders;
- dark-mode preference;
- every valid IndexedDB attachment referenced by a transaction.

The archive excludes:

- Firebase tokens and session state;
- Google/Firebase user profile data;
- allowlist and other caches;
- recent searches;
- notification records and read state;
- last-notification-check timestamps;
- current route, selected month, and session-only analytics lenses;
- onboarding/session flags that are not necessary to reconstruct the workspace;
- `cloudBackupEnabled` and cloud-backup timestamps.

### Restore Semantics

- V1 supports **replace only**; merge is out of scope.
- The complete file is read, decrypted when necessary, structurally validated, migrated, normalized, and staged before the first destructive write.
- Existing local data requires a safety copy and recoverable local rollback state before replacement.
- Core-data integrity failures block restore with no data changes.
- A missing or damaged attachment produces a precise warning; the user may explicitly continue with valid financial data.
- Success is shown only after persisted data and attachments have been read back and verified.

### Security And Privacy

- Archive processing is local-only and must not call Gemini, Firebase, or another network service.
- Passphrase protection is selected by default.
- Unencrypted export remains available only after a clear sensitive-data warning.
- Archive encryption uses authenticated encryption through the Web Crypto API.
- Passphrase-derived keys use a random per-archive salt and are never derived from Firebase UID.
- Passphrases and decrypted archive contents are never persisted or logged.
- File recognition uses format signatures and validated metadata, not the `.aura` extension alone.

### Compatibility

- The first release declares both `formatVersion` and `schemaVersion` even though it initially reads only V1.
- Archives from unsupported future format versions fail before any local write.
- Legacy Aura transaction CSV continues to import transactions locally.
- Generic CSV/Excel continues through the existing bank-statement workflow.
- A portable archive must be classified before the spreadsheet parser or AI workflow is invoked.

## V1 Non-Scope

- merging archive contents with existing data;
- selective restore by entity or date range;
- automatic scheduled local exports;
- immediate migration of the existing Firestore backup transport;
- storing exported files on Aura-managed infrastructure;
- passphrase recovery or escrow;
- importing third-party backup formats;
- changing the canonical financial model beyond validation and migration support required for restore.

## Architecture Direction

Use the existing application boundaries rather than placing orchestration, persistence, and UI in one module.

```text
domain/archive
  archiveTypes
  archiveValidation
  archiveMigrations
  archiveIntegrity contracts

services/archive
  archiveBuilder
  archiveReader
  archiveCrypto
  restoreService

repositories
  attachmentRepository extensions
  restoreJournalRepository

components/archive
  export dialog
  import dialog
  preview
  progress
  result/recovery state

app/pages
  entrypoint composition only
```

The precise filenames may change during M0, but the responsibilities must remain separate.

### Export Pipeline

```text
Collect canonical data and preferences
→ collect referenced attachments
→ validate source snapshot
→ build manifest and payload
→ calculate integrity metadata
→ encrypt when selected
→ read the generated blob back through the archive reader
→ download only after self-verification succeeds
```

### Restore Pipeline

```text
Recognize format
→ read within size limits
→ decrypt
→ parse
→ validate archive contract
→ migrate schema
→ normalize AppData
→ validate cross-entity references
→ stage PreparedRestore
→ create rollback state and safety copy when needed
→ commit with journal checkpoints
→ read persisted state back
→ verify
→ clean staging and journal
```

### Prepared Restore Contract

The restore service should expose one prepared object before mutation:

```ts
interface PreparedRestore {
  data: AppData;
  preferences: AuraPortablePreferences;
  attachments: Map<string, string>;
  manifest: AuraArchiveManifest;
  warnings: RestoreWarning[];
}
```

No UI component should write individual storage keys directly.

## Milestone Plan

### M0. Contract, Architecture, And Baseline

Goal: freeze a safe implementation contract before feature code begins.

Status: **Done**

Tasks:

- [x] Approve one `.aura` file as distinct from transaction CSV.
- [x] Approve recovery-complete V1 scope, including attachments and user-created reminders.
- [x] Approve passphrase protection by default with warned plaintext export.
- [x] Approve replace-only restore.
- [x] Approve local-only processing and explicit AI isolation.
- [x] Approve a restore journal and pre-restore safety protection.
- [x] Create the discovery note and living progress tracker.
- [x] Align the project brief, solution strategy, and main delivery plan.
- [x] Define the exact outer envelope, payload layout, media type, and magic signature.
- [x] Decide whether to add an archive/compression dependency; document bundle-size and maintenance cost if added.
- [x] Define maximum input size, maximum expanded size, maximum attachment count, and mobile-memory budget.
- [x] Define cryptographic metadata, KDF work factor, error behavior, and browser compatibility policy.
- [x] Define the V1 manifest, preferences, attachment, warning, and error contracts.
- [x] Define strict runtime schemas for every archived entity and cross-entity invariant.
- [x] Define restore-journal states, resume/rollback rules, and startup recovery UX.
- [x] Decide whether to create an ADR for the portable format and split-storage recovery protocol.
- [x] Build representative fixtures: empty, typical, large, legacy fields, attachments, reminders, corrupt, and encrypted.
- [x] Record the current automated baseline with `npm run test:regression` before implementation.

Exit criteria:

- archive and restore contracts are explicit and reviewable;
- resource and security limits are documented;
- the restore state machine has no ambiguous interruption state;
- representative test fixtures exist;
- no foundational technical decision remains open.

Evidence:

- accepted [`ADR 0001`](../../adr/0001-aura-portable-archive-v1.md);
- baseline TypeScript check passed;
- baseline Vitest result: 221 passed, 1 pre-existing unrelated `BottomNav` failure;
- production build was recorded separately after M1-M2 because the baseline regression command stopped at the known test failure.

### M1. Archive Domain, Validation, And Integrity

Goal: implement pure, testable contracts before browser-storage or UI orchestration.

Status: **Done**

Tasks:

- [x] Add versioned archive, envelope, manifest, preferences, attachment, warning, and error types.
- [x] Implement strict runtime validation without treating TypeScript casts as validation.
- [x] Reject non-finite amounts, invalid dates, malformed IDs, incompatible duplicates, missing required sections, and unsupported versions.
- [x] Validate transaction-to-attachment and transaction-to-recurring references.
- [x] Implement the V1 migration registry and explicit unsupported-version errors.
- [x] Pass restored canonical data through `normalizeAppData()` only after structural validation and migration.
- [x] Implement deterministic counts and SHA-256 integrity metadata.
- [x] Add unit tests for valid, partial, malformed, corrupt, legacy-field, and future-version payloads.
- [x] Verify that recurring normalization does not create unexpected duplicate materialized transactions.

Exit criteria:

- untrusted archive input cannot reach persistence without strict validation;
- V1 round-trip data contracts are deterministic;
- unsupported or corrupt core payloads fail with typed, user-mappable errors;
- unit tests cover every blocking validation class.

Evidence:

- domain implementation under `src/domain/archive/`;
- canonical integrity and strict validation tests pass;
- combined API enforces `migrate → validate → normalize` ordering;
- future versions, corrupt input, duplicate IDs/occurrences, attachment references, headers, preferences, and checksum changes are covered.

### M2. Complete Local-Data Capture

Goal: read and stage every V1-supported local data source through repository APIs.

Status: **Done**

Tasks:

- [x] Extend `attachmentRepository` to enumerate only Aura attachment keys.
- [x] Remove direct `idb-keyval` attachment access from page code where needed so one repository owns attachment persistence.
- [x] Add attachment staging, commit, rollback, and orphan cleanup operations.
- [x] Preserve attachment transaction IDs and validate that marker fields match stored attachment content.
- [x] Add typed read/write access for portable notification preferences, custom reminders, and appearance.
- [x] Confirm defaulting behavior for missing preferences from older schemas.
- [x] Ensure excluded localStorage keys cannot enter the archive accidentally.
- [x] Add repository tests for enumeration, missing attachments, failed writes, rollback, and cleanup.
- [x] Measure typical and worst-case attachment representation size on mobile-oriented fixtures.

Exit criteria:

- one service can collect the complete approved V1 snapshot without reading session or identity data;
- attachments can be staged and rolled back without disturbing unrelated IndexedDB data;
- size measurements satisfy the M0 resource budget.

Evidence:

- `AddTransaction` now uses `attachmentRepository`; `idb-keyval` is isolated to the repository;
- attachment clear/cleanup is prefix-selective and preserves unrelated IndexedDB entries;
- partial legacy notification preferences normalize through one shared default; malformed reminders fail rather than disappearing silently;
- snapshot service collects validated AppData, portable preferences, and referenced attachment inventory only;
- 500 KiB raw image fixture: about 682,691 Data URL bytes; 20 such images: about 13.0 MiB;
- 2 MiB raw maximum image: about 2,796,227 Data URL bytes (33.33% overhead);
- 32 MiB mobile target fits approximately 11 maximum-size images; 64 MiB hard cap fits approximately 23 before other payload content;
- browser peak-memory verification remains a release gate in M7.

### M3. Export, Encryption, And Self-Verification

Goal: create one portable archive that is verified before it is offered for download.

Status: **Done**

Tasks:

- [x] Implement the archive builder against the M1-M2 contracts.
- [x] Implement Web Crypto encryption and decryption with random per-archive salt and nonce/IV.
- [x] Keep passphrases and derived key material memory-only.
- [x] Implement explicit unencrypted envelope behavior; the user-facing sensitive-data warning remains an M6 presentation concern.
- [x] Add archive-size preflight and actionable export errors.
- [x] Generate a stable filename such as `aura-backup-YYYY-MM-DD.aura`.
- [x] Self-verify the generated blob through the same reader used by import before returning it to the download UI.
- [x] Keep object-URL creation outside the service; M6 owns download and immediate URL revocation.
- [x] Implement export progress, cancellation-before-download, success, and failure service states.
- [x] Add encrypted and plaintext round-trip tests, wrong-passphrase tests, tamper tests, and deterministic manifest tests.

Exit criteria:

- a complete fixture exports as one file and reads back to an equivalent prepared snapshot;
- wrong passphrase or tampering produces no download marked as valid;
- no network request, sensitive log entry, or identity-bound encryption material is used;
- large-file failures are predictable and non-destructive.

Evidence:

- `archiveBuilder`, `archiveReader`, `archiveBinary`, and `archiveCrypto` implement the V1 codec and typed limits;
- encrypted payloads use AES-256-GCM with header bytes authenticated as AAD and PBKDF2-SHA-256 at 600,000 iterations;
- the builder returns a blob only after the production reader verifies the generated archive;
- codec tests cover plaintext/encrypted round trips, wrong passphrases, tampering, signature rejection, incomplete snapshots, and cancellation.

### M4. Import Preflight And Restore Preview

Goal: inspect an archive completely and clearly before the user authorizes replacement.

Status: **Done**

Tasks:

- [x] Add format recognition before spreadsheet parsing and AI categorization.
- [x] Reject renamed non-Aura files using signature and manifest checks, not extension alone.
- [x] Implement local file read, encrypted-file unlock, and retry-safe passphrase UX.
- [x] Enforce envelope and payload limits before materializing unsafe content; V1 is intentionally uncompressed.
- [x] Build `PreparedRestore` without mutating app state, localStorage, or IndexedDB.
- [x] Show source date, app/build version, entity counts, attachment status, encryption status, and warnings.
- [x] Distinguish blocking errors from warnings that permit explicit continuation.
- [x] Make `Replace current data` the only restore mode.
- [x] Provide accessible focus management, keyboard behavior, progress, and error recovery.
- [x] Add component/integration tests proving that preflight is local-only and leaves storage unchanged.
- [x] Add a regression test proving `.aura` never invokes Gemini or the spreadsheet parser.

Exit criteria:

- the user can understand exactly what will be replaced;
- every blocking failure occurs before mutation;
- archive classification cannot fall through to AI;
- preview and error states work in light/dark mode and with keyboard navigation.

Evidence:

- `archivePreflightService` performs inspection and complete preparation without persistence calls;
- `ImportArchiveDialog` and `RestorePreview` expose unlock, validation, counts, warnings, and replace-only continuation;
- the spreadsheet wizard checks the binary signature before parsing, and its regression test proves neither the parser nor Gemini is invoked;
- preflight tests spy on network and localStorage writes and observe neither.

### M5. Replace Restore, Journal, And Recovery

Goal: replace the workspace predictably and recover from interruption across localStorage and IndexedDB.

Status: **Done**

Tasks:

- [x] Implement a restore-journal repository with explicit state transitions.
- [x] Stage target attachments under restore-scoped keys.
- [x] Persist recoverable previous and target snapshots without relying only on a browser download.
- [x] Generate and self-verify a downloadable safety archive when existing meaningful data is present.
- [x] Require explicit user acknowledgement before replacing non-empty data.
- [x] Commit canonical data and preferences through service/repository APIs, not UI components.
- [x] Promote staged attachments only after core data reaches the intended journal checkpoint.
- [x] Read back and verify canonical data, preferences, attachment content, and references.
- [x] Resume or roll back safely when Aura starts with an incomplete restore journal.
- [x] Clean temporary data only after successful verification or confirmed rollback.
- [x] Prevent automatic cloud backup from overwriting a valid remote backup during an incomplete restore.
- [x] Add transition-order and fault-injection coverage for commit, rollback, pre-commit cleanup, and post-core resume paths; exhaustive browser reload coverage was completed in M7.
- [x] Add regression tests for non-empty restore, safety-copy confirmation, storage quota failure, interruption, resume, rollback, and empty-archive acceptance.

Exit criteria:

- interruption at every modeled checkpoint has one deterministic recovery path;
- current data remains recoverable when replacement fails;
- success means persisted read-back equivalence, not merely successful React dispatch;
- cloud backup cannot accidentally publish an empty or partial restore.

Evidence:

- the journal persists previous and target snapshots separately from canonical keys and records every destructive checkpoint;
- `RestoreRecoveryGate` runs before auth, preferences, app-data hydration, and cloud-backup effects;
- verified safety-copy acknowledgement is mandatory when meaningful current data exists;
- restore tests cover successful replace, exact transition order, injected core-store failure with rollback, missing confirmation, quota/staging failure, pre-commit interruption cleanup, and post-core resume;
- full suite after M5: 259 passed and the same single pre-existing unrelated `BottomNav` assertion failed; TypeScript and production build pass.

### M6. Product UX And Legacy-Import Separation

Goal: make the two data workflows unmistakably different without regressing existing import/export behavior.

Status: **Done**

Tasks:

- [x] Add a `Complete Aura archive` area under Privacy & Backup or Data Management.
- [x] Add `Export complete archive` and `Import Aura archive` entrypoints.
- [x] Rename the existing export affordance to `Export transactions CSV`.
- [x] Keep `Import bank statement` separate and disclose AI processing only in that workflow.
- [x] Remove the current two-download CSV behavior; CSV now downloads transaction rows only.
- [x] Show export contents and counts before archive creation.
- [x] Show encryption selected by default and make plaintext risk explicit.
- [x] Show real archive-build and restore phases, safety-copy creation, replacement, persisted verification, and recovery status.
- [x] Cover loading, empty, warning, blocking error, cancellation, success, and startup-recovery states.
- [x] Ensure dialogs use shared UI primitives, semantic tokens, focus trapping, accessible labels, and reduced-motion-compatible behavior.
- [x] Preserve legacy Aura transaction CSV import and generic CSV/Excel paths.

Exit criteria:

- users cannot reasonably mistake CSV for a complete backup;
- archive and bank-statement imports have separate privacy explanations;
- all new states meet baseline accessibility and design-system requirements;
- legacy workflows remain functional.

Evidence:

- Profile Data Management now leads with complete archive export/import and explains the narrower CSV contract separately;
- passphrase protection is selected by default; plaintext requires an explicit readable-data acknowledgement;
- export counts are collected from the complete local snapshot before build and incomplete attachment state blocks the action;
- restore preview and confirmation expose warnings, replace-only semantics, safety-copy protection, real progress phases, and startup recovery;
- UI tests cover encrypted defaults, plaintext acknowledgement, safety-copy download, entrypoint separation, single transaction CSV output, and temporary URL revocation.

### M7. Hardening, Regression, And Recovery QA

Goal: prove the disaster-recovery promise under realistic and adversarial conditions.

Status: **In progress**

Tasks:

- [x] Run the full recovery acceptance scenario from populated workspace to wipe to restore in automated desktop Chromium.
- [x] Verify exact preservation of IDs, amounts, categories, recurring links/overrides, goals, reminders, preferences, and attachments in the Chromium E2E round trip.
- [x] Verify empty and minimal archives through codec/restore fixtures.
- [x] Verify wrong passphrase, modified ciphertext, modified plaintext payload, missing sections, duplicate IDs, invalid dates, invalid amounts, and future versions.
- [x] Verify missing/corrupt attachment warnings and explicit continuation behavior at domain/service/UI boundaries.
- [x] Verify quota exhaustion and maximum-size enforcement in automated boundary/fault tests.
- [x] Verify interruption and reload at every restore-journal checkpoint.
- [x] Verify no network requests during export/build, archive inspection, and restore.
- [x] Verify legacy Aura CSV isolation and AI-assisted bank-statement routing independently.
- [x] Test desktop Chromium/WebKit and Pixel 5/iPhone 13 emulated browser profiles.
- [x] Verify the production manifest and active service-worker lifecycle in Chromium.
- [ ] Test physical supported mobile browsers and actual installed-PWA behavior.
- [x] Measure automated typical/5,000-transaction codec behavior; real-device 32 MiB memory/time measurement remains open.
- [x] Automate light/dark axe scans, 320/360/390/430 px layout checks, keyboard focus, accessible names, and reduced motion.
- [ ] Complete manual screen-reader and physical-device visual checks.
- [x] Run `npm run lint`, `npm run test`, and `npm run build` throughout delivery.
- [x] Run `npm run test:regression` successfully as one chained final automated gate.

Exit criteria:

- the acceptance scenario passes on supported browsers;
- no high-severity data-loss, privacy, or compatibility defect remains;
- performance stays within the M0 mobile budget;
- automated and manual verification evidence is recorded in this document.

Current evidence:

- TypeScript: passed;
- Vitest: 273 passed across all 48 files;
- Playwright: 29/29 project cases passed in 1.8 minutes across Chromium, WebKit, Pixel 5/iPhone 13 emulation, and the PWA lifecycle project;
- production build: passed; main bundle 1,994.52 KiB / 522.49 KiB gzip and existing chunk-size/PapaParse warnings remain;
- large automated fixture: 5,000 transactions round-trip below the 64 MiB boundary;
- every V1 journal status is covered through an automated real Chromium reload and exact target/previous snapshot assertion;
- browser/PWA execution matrix and privacy-safe synthetic fixture: [`docs/07-qa/portable-archive-browser-acceptance.md`](../07-qa/portable-archive-browser-acceptance.md);
- automated desktop Chromium/WebKit, mobile viewport, checkpoint reload, PWA shell, responsive, keyboard, reduced-motion, and axe evidence is complete;
- physical mobile/PWA, approximately 32 MiB least-capable-device memory/time, and manual screen-reader evidence remain open;
- release-blocking unchecked tasks above remain required; M7 is not complete.

### M8. Documentation And Release Readiness

Goal: align product, operational, privacy, and release documentation with implemented behavior.

Status: **In progress**

Tasks:

- [x] Update `product/project-brief.md` from approved initiative to implemented capability with remaining release gates.
- [x] Finalize archive and restore decisions in `01-solution-strategy.md` and ADR 0001.
- [x] Update `02-delivery-plan.md` with release evidence and remaining follow-ups.
- [x] Update `docs/testing-strategy.md` with portable archive and restore-journal coverage.
- [x] Update `docs/04-privacy-gdpr/privacy-notes.md` for exported financial data, attachments, local processing, user-controlled exported-file retention, and deletion limitations.
- [ ] Approve and incorporate the engineering data-inventory/retention/RoPA/rights draft into authoritative governance; role, lawful basis, DPIA screening, and legal-source baseline still require the privacy owner.
- [x] Document that deleting Aura data or cloud backup cannot delete copies already exported by the user.
- [x] Document passphrase loss behavior and plaintext-export risk in user-facing UI and feature spec.
- [x] Update `CHANGELOG.md` after implementing the product entrypoints.
- [x] Document rollback, compatibility, known limits, and privacy-safe support diagnostics in the operational runbook.
- [x] Record automated checks, unavailable browser QA, residual risks, and the current not-ready release decision.

Exit criteria:

- documentation describes implemented reality;
- privacy and deletion semantics are explicit;
- rollback and compatibility expectations are operational;
- release evidence and residual risks are recorded.

Documentation evidence:

- user-facing behavior: [`docs/specs/portable-archive-v1.md`](../specs/portable-archive-v1.md);
- operations and rollback: [`docs/03-operations/portable-archive-runbook.md`](../03-operations/portable-archive-runbook.md);
- personal-data, retention, deletion, rights, processor/transfer, and DPIA engineering assessment: [`docs/04-privacy-gdpr/privacy-notes.md`](../04-privacy-gdpr/privacy-notes.md);
- draft processing record for privacy-owner approval: [`docs/04-privacy-gdpr/portable-archive-processing-record.md`](../04-privacy-gdpr/portable-archive-processing-record.md);
- release decision: **not ready for general release** until M7 real-browser gates and privacy-owner governance confirmation close.

## Dependency Map

| Work | Depends on | Unblocks |
|---|---|---|
| M0 technical contract | Approved product direction | All implementation |
| M1 types/validation/integrity | M0 | M3, M4, M5 |
| M2 complete data capture | M0 and M1 types | M3 and M5 |
| M3 export/crypto | M1 and M2 | Real import fixtures and M4 |
| M4 preflight/preview | M1 and readable M3 archive | M5 and M6 restore UX |
| M5 journaled restore | M2 and M4 | Recovery acceptance testing |
| M6 product UX | Stable M3-M5 service APIs | End-to-end QA |
| M7 hardening | Incremental output from M1-M6 | Release readiness |
| M8 docs/release | Verified M1-M7 behavior | Release |

## Test Matrix

| Layer | Minimum coverage |
|---|---|
| Domain/unit | schemas, version routing, migrations, counts, checksums, reference validation, typed errors |
| Crypto/unit | encrypted/plaintext round trips, wrong passphrase, random salt/IV, tampering, metadata validation |
| Repository | attachment enumeration/staging/rollback, journal transitions, preference persistence, quota failures |
| Service/integration | build-read equivalence, prepared restore, self-verification, commit/read-back verification, resume/rollback |
| React/component | export options, passphrase flow, preview, warning/error states, replace confirmation, progress, recovery prompt |
| Regression | legacy Aura CSV, generic spreadsheet import, cloud-backup overwrite protection, recurring normalization |
| Manual | real download/import, wipe/restore, mobile memory, installed PWA, light/dark, narrow widths, keyboard, reduced motion |

## Recovery Acceptance Fixture

The release-blocking fixture must contain at least:

- income, expense, extra, and reimbursement transactions;
- recurring-generated and manually edited recurring occurrences;
- multiple budgets and accounts;
- active and archived categories;
- savings goals;
- notification preferences and custom reminders;
- transactions with and without receipt attachments;
- current and legacy-normalizable fields.

Acceptance sequence:

```text
Populate fixture
→ export encrypted .aura
→ verify generated archive
→ erase supported local Aura state
→ reload as an empty workspace
→ import and unlock archive
→ preview and replace
→ reload application
→ compare canonical data, preferences, references, and attachments
→ confirm zero archive-related network calls
```

## Privacy, Security, AI, And Cost Review

### Personal Data Touched

- financial transactions and descriptions;
- account labels and partial account identifiers;
- budgets, goals, categories, and recurring activity;
- reminder titles and notes;
- receipt images or other user-selected attachments;
- appearance and notification preferences.

### Privacy And GDPR Position

- Export is initiated by the user and processed locally.
- No new processor, subprocessor, backend, or cross-border transfer is introduced by V1.
- The exported file leaves Aura-controlled storage and its retention becomes user-controlled.
- Local deletion and cloud-backup deletion cannot remove copies the user has exported.
- Plaintext export requires an explicit warning because the file may expose sensitive financial and receipt data.
- This plan records engineering behavior, not a claim of legal certification.

### AI Governance

- AI is not needed for archive build, inspection, validation, migration, or restore.
- `.aura` classification must occur before the existing AI-assisted import branch.
- An automated regression test must prove that archive processing does not call Gemini.
- No new AI Act workflow or model governance artifact is required for this feature unless scope changes.

### Observability

- Use typed local error codes and phase names for supportability.
- Never log passphrases, decrypted payloads, transaction details, reminder text, attachment content, Firebase UID, or user email.
- If aggregate timing is measured, keep it free of archive contents and personal identifiers.
- User-visible progress must reflect real service phases rather than simulated timers.

### FinOps And Admin Cost Visibility

- V1 adds no provider calls, hosted storage, AI usage, or usage-based backend cost.
- An admin cost panel is not required for the manual local archive.
- Bundle size, browser memory, and CPU time are the relevant cost budgets and must be measured in M0/M7.
- Cloud transport integration requires a separate storage/cost design review before implementation.

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|
| Archive claims completeness but omits attachments or preferences | Medium | High | Recovery-complete scope and acceptance fixture | Open |
| Crash leaves mixed localStorage/IndexedDB state | Medium | Critical | Staging, journal checkpoints, startup resume/rollback, fault injection | Open |
| Malformed archive causes invalid financial state | Medium | Critical | Strict runtime schemas before normalization or persistence | Open |
| Large attachments exhaust mobile memory or quota | Medium | High | Size budgets, preflight limits, measurements, clear errors | Open |
| Forgotten passphrase prevents recovery | Medium | High | Optional plaintext path with warning; explicit no-recovery copy | Open |
| Plaintext archive exposes financial/receipt data | Medium | High | Encryption selected by default and explicit warning | Open |
| `.aura` falls through to Gemini import | Low | Critical | Signature-first classifier and no-network regression test | Open |
| Restore triggers cloud overwrite with partial/empty data | Low | Critical | Backup suppression until verified restore completion | Open |
| Future app cannot interpret old backup | Medium | High | Format/schema versions and migration registry from V1 | Open |
| Safety-copy download is assumed to be durable | Medium | High | Keep recoverable local rollback state; do not rely only on download | Open |
| Added archive dependency increases bundle/security burden | Medium | Medium | M0 dependency decision and bundle/maintenance review | Open |

## Definition Of Ready

Implementation may begin when:

- the M0 product and technical contracts are documented;
- archive size and memory limits are explicit;
- encryption metadata and restore-journal transitions are defined;
- representative fixtures exist;
- affected repositories, services, UI entrypoints, and tests are mapped;
- no unresolved decision can change the V1 recovery promise.

## Definition Of Done

Aura Portable Archive V1 is done when:

- one `.aura` file reconstructs every supported data class, preference, reminder, and valid attachment;
- encryption is selected by default and plaintext export has an explicit warning;
- export self-verifies before download;
- import validates completely and never enters the AI path;
- restore is replace-only, journaled, recoverable, and verified after persistence;
- legacy CSV and spreadsheet imports remain functional;
- automated unit, integration, component, fault-injection, and regression tests pass;
- the wipe-and-restore acceptance scenario passes on supported browsers;
- accessibility, theme, mobile-size, memory, privacy, security, and documentation gates pass;
- `npm run test:regression` passes;
- release evidence and residual risks are recorded here.

## Progress Update Protocol

When work changes state:

1. update the dashboard status and `Last updated` date;
2. check completed tasks only when their tests and required docs are complete;
3. add a short dated entry to the progress log;
4. record blockers and scope changes explicitly;
5. attach test commands, counts, performance measurements, and manual QA evidence to the relevant milestone;
6. do not mark a milestone `Done` while an exit criterion remains unmet.

## Progress Log

| Date | Milestone | Update | Evidence / next action |
|---|---|---|---|
| 2026-07-22 | M0 | Approved recovery-complete, encrypted-by-default, replace-only V1 direction and created the living delivery tracker | Next: freeze envelope, limits, crypto metadata, journal states, and test fixtures |
| 2026-07-22 | M0 | Accepted ADR 0001, froze binary envelope, security/resource limits, restore states, fixtures, and baseline | M0 complete; known unrelated BottomNav test failure recorded |
| 2026-07-22 | M1 | Implemented archive contracts, strict runtime validation, migration routing, normalization gate, deterministic checksums, and reference checks | Domain and integrity tests pass |
| 2026-07-22 | M2 | Centralized attachment persistence, added inventory/staging/rollback/cleanup, portable preferences, snapshot collection, and sizing evidence | M2 and Add Transaction regression tests pass; next M3 |
| 2026-07-22 | M3-M5 | Implemented self-verified codecs, local preflight, journaled replace, safety protection, rollback, and startup recovery | Service, fault, crypto, preflight, and AI-isolation tests pass |
| 2026-07-22 | M6 | Added complete archive entrypoints, encrypted-default export, replace confirmation, safety download, and transaction-only CSV separation | M6 UI and download tests pass; M6 complete |
| 2026-07-22 | M7 | Added large/empty/adversarial fixtures and deterministic coverage for every journal state; fixed the stale BottomNav elevation contract | `npm run test:regression` passes; real-browser checklist remains |
| 2026-07-22 | M8 | Added feature spec, operational runbook, QA matrix, privacy notes, and draft processing record | Privacy-owner decisions and browser/PWA evidence remain release-blocking |
| 2026-07-22 | M7 | Added a loopback-only synthetic E2E auth adapter and a build guard that forbids packaging the bypass | Next: add Playwright fixture loading and end-to-end archive journeys against `npm run dev:e2e` |
| 2026-07-23 | M7 | Added Playwright, a deterministic synthetic financial/receipt fixture, and six isolated Chromium journeys | `npm run test:e2e`: 6/6 passed in 47.5s; WebKit, real mobile/PWA, interruption, memory, and accessibility evidence remain |
| 2026-07-23 | M7 | Expanded Playwright to WebKit, mobile emulation, all restore-journal reload states, responsive/theme/axe/keyboard/reduced-motion checks, resource evidence, and PWA shell lifecycle | `npm run test:e2e`: 29/29 passed in 1.8m; physical-device/PWA, 32 MiB mobile memory, and manual screen reader remain |

## Release Evidence

Current evidence after M6 and automated M7-M8 work:

- `npm run test:regression`: passed end to end;
- TypeScript: passed;
- Vitest: 273/273 passed across 48 files;
- Playwright: 29/29 passed across desktop Chromium/WebKit, mobile emulation, checkpoint reload, and PWA lifecycle projects;
- production build: passed with the existing mixed PapaParse import and large-chunk warnings;
- automated archive and journal adversarial coverage: passed;
- physical-browser/installed-PWA/mobile-memory/manual-screen-reader evidence: pending in the QA checklist;
- privacy engineering record: drafted; owner approval pending;
- current release decision: not ready for general release until the two pending gates close.
