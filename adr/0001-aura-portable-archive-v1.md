# ADR 0001: Aura Portable Archive V1

- Status: Accepted
- Date: 2026-07-22
- Owners: Aura Finance maintainers
- Delivery tracker: [`docs/00-discovery/10-portable-archive-progress-plan.md`](../docs/00-discovery/10-portable-archive-progress-plan.md)

## Context

Aura stores canonical financial data in localStorage and receipt attachments in IndexedDB. The existing CSV export creates separate transaction and budget downloads and cannot reconstruct recurring entries, accounts, categories, savings goals, preferences, reminders, or attachment content. Generic spreadsheet import may use Gemini, which is not an acceptable path for a private disaster-recovery artifact.

Aura needs one user-controlled file that can restore the complete supported workspace after local data loss. The format must be locally recognizable, versioned, integrity-protected, optionally encrypted, bounded against hostile input, and recoverable across localStorage and IndexedDB even though those stores cannot share an atomic transaction.

## Decision

### Product Boundary

- `.aura` is the complete manual disaster-recovery format.
- CSV remains a separate transaction interoperability format.
- V1 restore replaces the current workspace; it does not merge.
- Archive processing happens entirely in the browser and is classified before spreadsheet parsing or AI categorization.
- Manual portable archive delivery remains independent from the current Firestore transport in V1.

### Binary Container

V1 uses a small first-party binary envelope and adds no archive/compression dependency.

```text
Offset  Size                 Content
0       8 bytes              ASCII magic: AURAARC1
8       4 bytes              Unsigned big-endian JSON header length
12      header length        UTF-8 JSON header
...     payloadByteLength    Raw payload bytes
```

Media type:

```text
application/vnd.aura.portable-archive
```

The payload is UTF-8 JSON when unencrypted and AES-GCM ciphertext when passphrase protected. The JSON payload contains:

```text
manifest
canonical AppData
portable preferences
attachment records keyed by transaction ID
```

Attachments remain Base64 data URLs in V1 because that is the existing IndexedDB representation. The binary outer envelope avoids Base64-encoding the entire JSON or ciphertext again.

No compression is used in V1. Receipt images are already compressed formats in normal use, compression complicates expanded-size enforcement, and adding a dependency before measurements demonstrate value would increase bundle and maintenance cost.

### Versioning

The header and manifest declare `formatVersion: 1`. The manifest separately declares `schemaVersion: 1`.

- `formatVersion` governs the binary envelope and crypto metadata.
- `schemaVersion` governs the decrypted JSON payload.
- Future schema readers route through an explicit migration registry.
- Unsupported future versions fail before any persistence call.
- V1 has an identity migration only; no older portable archive format exists.
- Legacy local/cloud fields remain the responsibility of existing model normalization or a future explicit archive migration. They are not silently accepted as malformed schema V1 fields.

### Integrity

- Canonical JSON sorts object keys recursively and preserves array order.
- The manifest stores SHA-256 checksums for canonical AppData, portable preferences, and every attachment data URL.
- The manifest stores expected counts for every top-level collection.
- Plaintext headers store a SHA-256 checksum of the complete payload bytes.
- Encrypted payload integrity is provided by AES-GCM; the exact serialized header bytes are used as additional authenticated data.
- The generated archive is read back through the production reader before download is offered.

### Encryption

Passphrase protection is selected by default but is not mandatory.

V1 parameters:

- AES-256-GCM;
- 12-byte random IV;
- 128-bit authentication tag;
- PBKDF2-HMAC-SHA-256;
- 600,000 minimum iterations;
- 16-byte random per-archive salt;
- passphrases are accepted from 10 through 1,024 characters;
- passphrase and derived key material remain memory-only;
- no Firebase UID, account identifier, or device identifier participates in key derivation.

Wrong passphrase, modified metadata, and modified ciphertext map to one non-revealing decryption failure. Browser support requires Web Crypto, TextEncoder/TextDecoder, Blob/ArrayBuffer, IndexedDB, and localStorage; the archive controls remain unavailable with an explanatory message when required primitives are absent.

### Resource Limits

V1 constants are centralized in `src/domain/archive/archiveConstants.ts`:

- maximum JSON header: 64 KiB;
- maximum archive file: 64 MiB;
- maximum payload: 64 MiB minus the 64 KiB header allowance and 12-byte fixed envelope prefix, so a valid file always remains within the 64 MiB archive limit;
- maximum attachment count: 250;
- maximum decoded attachment: 2 MiB, matching the existing receipt-upload limit;
- target tested mobile archive: 32 MiB;
- target peak working memory: no more than three times archive size at the tested mobile target.

Import rejects limits before allocating or parsing more content than necessary. M7 performance measurements may lower supported limits; increasing them requires evidence from supported mobile browsers.

### Strict Validation

Archive input is untrusted.

- Runtime validation precedes migration-normalization side effects and all persistence.
- Schema V1 rejects unknown top-level/entity fields, missing required fields, non-finite amounts, invalid dates, malformed attachment data, duplicate IDs, incompatible recurring occurrences, count mismatches, checksum mismatches, and unsupported versions.
- Missing attachment content and unknown historical category/recurring references may be warnings when financial data remains structurally valid.
- `normalizeAppData()` runs only after V1 structure and migration are accepted.

### Complete Local Snapshot

Included:

- canonical AppData;
- notification preferences;
- custom reminders;
- dark-mode preference;
- valid receipt attachments referenced by transactions.

Excluded:

- authentication/session and Firebase profile data;
- allowlist and search caches;
- notification records/read state and technical timestamps;
- route, selected month, and session analytics state;
- onboarding/session flags not needed for reconstruction;
- cloud-backup enablement and timestamps.

Repositories own local persistence. Page components do not read/write IndexedDB keys directly. Attachment clearing is prefix-selective and must not clear unrelated IndexedDB values.

### Restore Journal

The V1 journal key is `aura_restore_journal_v1`. Large previous/target snapshots live in restore-scoped IndexedDB records; the journal stores references and checksums rather than duplicating them into localStorage.

Journal states:

```text
prepared
rollback-staged
attachments-staged
data-committing
data-committed
attachments-committed
verified
rolling-back
rolled-back
completed
failed
```

Startup recovery rules:

- `prepared`, `rollback-staged`, or `attachments-staged`: canonical data is unchanged; discard target staging and preserve the current workspace.
- `data-committing`, `data-committed`, or `attachments-committed`: verify the target snapshot; complete the restore only if persisted target data is equivalent, otherwise continue rollback from the previous snapshot.
- `verified`: finish cleanup and mark completed.
- `rolling-back` or `failed`: continue rollback; do not attempt a new restore until rollback is verified.
- `rolled-back` or `completed`: cleanup stale staging and remove the journal.

When meaningful current data exists, Aura must build and self-verify both a recoverable local previous snapshot and a downloadable safety archive before replacement. Failure to create either blocks V1 restore; there is no unsafe override in V1.

Automatic cloud backup remains suppressed from restore preparation until verified completion or verified rollback so empty or partial state cannot overwrite a valid remote backup.

## Architecture Placement

- `src/domain/archive`: contracts, validation, migrations, integrity, and format constants.
- `src/services/archive`: snapshot, build/read, crypto, and restore orchestration.
- `src/repositories`: AppData/preferences/attachment/journal persistence.
- `src/components/archive`: user flows and state presentation.
- pages compose entrypoints only.

## Consequences

### Positive

- The file is independent from identity, cloud availability, and AI services.
- The format is recognizable before JSON or spreadsheet parsing.
- Format and schema evolution are separate.
- No new runtime dependency is required for the V1 codec or restore protocol.
- Strict validators and deterministic checksums are reusable by manual and future cloud restore paths.
- Repository-owned attachment operations remove a persistence leak from page code.

### Negative

- V1 payloads are not compressed.
- Base64 receipt storage still carries its existing representation overhead.
- Cross-store recovery requires a journal and fault-injection testing.
- Default encryption introduces passphrase UX and unrecoverable-passphrase risk.
- The 64 MiB hard limit may require future streaming or attachment representation changes for unusually large workspaces.

## Alternatives Rejected

- Expand CSV: cannot preserve the complete graph, binary receipts, integrity, or migrations.
- ZIP dependency in V1: deferred until bundle and size measurements justify it.
- JSON-only Base64 envelope: rejected because it adds avoidable encoding overhead to the entire payload/ciphertext.
- UID-derived encryption: rejected because it breaks portability and recovery after identity changes.
- Merge restore: rejected for V1 because conflicts are difficult to explain and verify safely.
- localStorage-only rollback copy: rejected because size limits and multi-key writes make it unsuitable for reliable recovery.

## Verification Baseline

Baseline recorded before M1-M2 implementation on 2026-07-22:

- TypeScript check: passed.
- Vitest: 221 passed, 1 pre-existing failure.
- Known unrelated failure: `BottomNav.test.tsx` expects `-translate-y-5`; the component currently uses `-translate-y-4`.
- Production build did not run because the regression command stopped at the pre-existing test failure.

The unrelated navigation failure is not changed by this initiative and remains visible in the final quality gate until resolved by its owning workstream.

M3-M5 verification recorded on 2026-07-22:

- TypeScript check: passed.
- Targeted codec, preflight, AI-isolation, restore, rollback, quota, and recovery tests: passed.
- Full Vitest suite: 259 passed, with the same single pre-existing `BottomNav` failure.
- Production build: passed; existing bundle-size warnings remain visible for M7 performance work.

M6-M8 automated verification recorded on 2026-07-22:

- TypeScript check: passed.
- Vitest: all 269 tests passed across 46 files.
- Production build: passed; main client bundle is 1,994.43 KiB / 522.43 KiB gzip and remains above the existing warning threshold.
- Every journal state has an automated deterministic startup recovery assertion; real-browser reload injection remains release-blocking.
- Current release decision: not ready until browser/PWA/mobile-memory acceptance and privacy-owner governance confirmation are recorded.
