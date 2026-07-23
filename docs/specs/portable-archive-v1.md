# Aura Portable Archive V1

## User Outcome

Aura can export one `.aura` file and later use it to reconstruct the supported local workspace after data loss. This workflow is distinct from transaction CSV and from the optional encrypted cloud backup.

## Entry Point

Profile → Data Management → Complete Aura archive.

Available actions:

- `Export complete archive` creates and downloads one self-verified file;
- `Import Aura archive` recognizes, unlocks, validates, previews, and replaces the local workspace;
- `Export transactions CSV` exports transaction rows only and is not presented as disaster recovery;
- `Import bank statement or CSV` remains the separate spreadsheet workflow and may use Gemini only after its existing disclosure and consent.

## Export Flow

1. Aura collects canonical app data, supported preferences, reminders, and referenced receipt attachments locally.
2. The dialog shows included content and current entity counts.
3. Passphrase protection is selected by default. The passphrase must contain 10–1,024 characters and cannot be recovered by Aura.
4. Plaintext export requires explicit acknowledgement that financial data and attachments will be readable.
5. Aura validates, builds, encrypts when selected, and reads the generated blob back through the production archive reader.
6. The browser download begins only after self-verification. Temporary object URLs are revoked immediately after dispatching the download.

An incomplete referenced attachment blocks export because the resulting file would not satisfy the complete-backup promise.

## Import And Restore Flow

1. Aura recognizes the binary `AURAARC1` signature before spreadsheet parsing or AI categorization.
2. The complete archive is bounded, decrypted when needed, validated, migrated, normalized, and integrity-checked locally without persistence writes.
3. Preview shows creation date, source version, encryption status, counts, and warnings.
4. V1 offers replace only; merge and selective restore are not available.
5. If meaningful current data exists, the user must confirm replacement and supply a passphrase for a separately downloaded, self-verified safety archive.
6. Previous and target snapshots are persisted in restore-scoped IndexedDB records. A localStorage journal records each destructive checkpoint.
7. Core data, preferences, and staged attachments are committed, read back, and compared to the expected canonical fingerprint.
8. Aura reloads only after verified completion. Startup recovery runs before normal providers hydrate if a journal remains after interruption.

Warnings may be accepted only when core financial data remains valid. Blocking schema, version, integrity, size, or safety-copy failures never enter the destructive phase.

## Included Data

- transactions, budgets, recurring rules and overrides;
- accounts, active and archived categories, goals, and monthly budget;
- notification preferences, custom reminders, and dark-mode preference;
- valid IndexedDB receipt attachments referenced by transactions.

## Excluded Data

- login sessions, tokens, Firebase profile, and identity data;
- cloud-backup enablement and backup timestamps;
- allowlist, search, notification-record, and other technical caches;
- route, selected reporting month, analytics lens, and other session state.

## Limits And Compatibility

- format version: 1; schema version: 1;
- maximum archive: 64 MiB;
- maximum header: 64 KiB;
- maximum attachments: 250;
- maximum decoded attachment: 2 MiB;
- no compression in V1;
- supported future versions fail before persistence;
- required browser primitives: Web Crypto, Blob/ArrayBuffer, TextEncoder/TextDecoder, localStorage, and IndexedDB.

## Security And Privacy

- archive build, inspection, and restore make no network or AI calls;
- encryption uses AES-256-GCM and PBKDF2-HMAC-SHA-256 with 600,000 iterations, random 16-byte salt, and random 12-byte IV;
- the serialized header is authenticated as AES-GCM additional data;
- passphrases, decrypted contents, financial fields, reminder text, and attachments must not be logged;
- exported files are user-controlled copies outside Aura deletion controls.

## Known Limitations

- forgotten passphrases cannot be recovered;
- user-exported copies cannot be deleted by clearing Aura or its cloud backup;
- V1 is memory-bound and does not stream or compress large payloads;
- browser/device manual QA at the target mobile memory limit remains required before release.

## Acceptance Criteria

- encrypted and plaintext archives round-trip through the production reader;
- wrong passphrase, tampering, invalid structure, future version, and oversize input fail without mutation;
- existing meaningful data cannot be overwritten without confirmation and a verified safety-copy download;
- persisted data, preferences, references, and attachments match after restore and reload;
- interruption at a journal checkpoint has a deterministic resume or rollback path;
- `.aura` never reaches spreadsheet parsing or Gemini;
- legacy Aura CSV and generic spreadsheet workflows remain operational and separately described.
