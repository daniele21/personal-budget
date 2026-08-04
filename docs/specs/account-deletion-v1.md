# Aura Account Deletion V1

## User Contract

`Delete Aura account` is distinct from logout, `Delete local data`, and `Delete
local data and cloud backup`. It permanently deletes the current Firebase Auth
identity, encrypted Firestore backup versions, Aura-managed browser data and
owner-scoped Android payment-detection data.

The user must type `DELETE` and complete recent Google reauthentication. The UI
shows progress, disables duplicate submission and never reports success after a
partial failure. A failed attempt can be retried.

## Managed Surfaces

| Surface | Scope | V1 operation | Confirmation |
|---|---|---|---|
| Firebase Auth | current authenticated UID | `deleteUser` after reauth | SDK promise resolves |
| Firestore `backups/{uid}` | current UID only | delete document containing all encrypted slots | `deleteDoc` resolves |
| localStorage | finite `STORAGE_KEYS` registry | remove each registered key | synchronous completion |
| IndexedDB | `attachment_` and restore-staging namespaces | finite key deletion | all deletes resolve |
| Android native | registered owner partition | `total_deletion` purge | plugin promise resolves |
| Exported files | user-controlled filesystem/cloud | not deletable by Aura | disclosed before/success |
| `allowedUsers/{emailHash}` | access-control record | not client-deletable in V1 | privacy/backend decision required pre-beta |
| retired Gemini records | legacy, not current client-owned | no implicit deletion | governed by retirement record/C6 |

## Failure And Recovery

- Reauthentication failure performs no destructive work.
- Remote deletion failure stops before native, local or Auth deletion.
- Native/local/Auth failure reports a retryable partial failure and never
  success.
- Operations are idempotent and scoped; retrying a completed delete against an
  absent surface must not delete another account's data.
- The operation does not log identifiers or content. User-visible errors use
  bounded phases only.

## Public Path

`/account-deletion` is reachable without an app session. Signed-out users are
asked to authenticate the account they intend to delete. Users unable to access
that identity are directed to `support@staituned.com`; support targets a reply
within one week and must verify identity proportionately before manual action.

## Acceptance

- unit: ordering, stop-on-failure, unconfirmed remote deletion, local namespace;
- component: signed-out guidance, confirmation gate, loading/failure/success;
- integration: Firebase emulator/Auth account and backup deletion;
- Android: Room/preferences/tombstone/journal/Keystore purge on API 36;
- E2E: online, offline, cancelled reauth, retry, double tap and account switch.
