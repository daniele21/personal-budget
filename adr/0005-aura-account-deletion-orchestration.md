# ADR 0005: Aura Account Deletion Orchestration

- Status: Accepted
- Date: 2026-08-04

## Context

Aura previously exposed local reset and cloud-backup deletion but did not delete
the Firebase Authentication identity. The operation spans Firebase Auth,
Firestore backup, browser localStorage/IndexedDB and Android native storage.
Reporting success after only a subset would mislead the user and could strand a
remote backup after the credential is deleted.

## Decision

Use a typed client-side orchestrator with this fixed order:

1. recent Google reauthentication;
2. delete and confirm the UID-scoped Firestore backup document;
3. purge owner-scoped Android payment-detection storage and keys;
4. delete Aura-registered localStorage and IndexedDB data;
5. delete the current Firebase Authentication identity;
6. report success only after every required step resolves.

Every step is awaited and fail-closed. A failed step stops later destructive
work and exposes retry without logging UID, email, tokens or financial data.
Deletion remains safe to repeat because every adapter targets the current
authenticated identity or a finite Aura-owned namespace.

The allowlist record is not made client-deletable. Its document ID is an email
hash and current Firestore rules cannot prove that an authenticated UID owns an
arbitrary hash. Permitting client deletion would weaken authorization. Removal
or documented retention of this record therefore remains a privacy/backend gate
before closed beta.

## Alternatives Rejected

- Extend `resetAll`: rejected because a reducer action cannot coordinate remote,
  native and authentication lifecycles or confirm completion.
- Delete Firebase Auth first: rejected because the client would lose authority
  to delete the UID-scoped Firestore backup.
- Allow any authenticated client to delete allowlist documents: rejected
  because it enables deletion of another user's access record.
- Claim that local/cloud reset closes the account: rejected because it leaves
  the Firebase identity active.

## Consequences

- `/account-deletion` is reachable with or without an active session; a signed-
  out user signs in and is reauthenticated again immediately before deletion.
- Existing exported `.aura`/CSV files remain user-controlled and cannot be
  deleted by Aura.
- Physical Android, Firebase/Play-installed and support-path evidence remain
  release gates even though the application boundary is implemented.
