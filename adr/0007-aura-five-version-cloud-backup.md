# ADR 0007: Aura Five-Version Cloud Backup Storage

- Status: Accepted
- Date: 2026-08-04

## Context

Aura currently stores three encrypted snapshots plus a compatibility copy of
the latest payload inside one Firestore document at `backups/{uid}`. Increasing
that array to five would make one document contain roughly six encrypted
payloads and creates a growing document-size failure mode for large ledgers.

Deleting a Firestore parent document also does not delete subcollection
documents, so a versioned layout requires an explicit deletion contract.

## Decision

Use `backups/{uid}` as the user-scoped metadata and compatibility document and
store encrypted versions at `backups/{uid}/versions/{versionId}`.

The invariant is at most five managed version documents per UID, ordered newest
first. Each version contains an opaque ID, server-backed creation time,
client-created ISO time, AES-GCM ciphertext and IV, plaintext SHA-256 checksum
and schema version. Firestore never receives plaintext financial data or a
decryption key.

The client supports dual-read migration from legacy single-slot and three-slot
parents. Migration is idempotent and occurs during an authenticated backup
write or explicit maintenance action, not as an unannounced mutation during a
read. The parent may temporarily mirror the newest payload for the documented
compatibility window; that mirror is not a sixth backup.

Backup deletion and account deletion enumerate and delete every UID-scoped
version, verify that none remain, and then delete the parent. Success is not
reported after deleting only the parent.

## Alternatives Rejected

- Store five slots in the parent document: rejected because payload growth can
  exceed the Firestore document limit and fail unpredictably.
- Retain five only while under a byte budget: rejected because the user-facing
  promise would silently degrade to fewer versions.
- Store server-readable plaintext metadata derived from financial content:
  rejected as unnecessary for restore and retention.

## Consequences

- Firestore rules and emulator coverage expand to the versions subcollection.
- Backup list/restore uses bounded reads of at most five version documents plus
  the parent.
- Account-deletion orchestration must handle subcollection deletion explicitly.
- Reads, writes and storage increase modestly and must be recorded in release
  evidence; no new provider or subprocessor is introduced.
- Privacy and retention documentation changes from three to five encrypted
  snapshots.

