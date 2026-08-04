# Aura Account Deletion Engineering Record

- Date: 2026-08-04
- Engineering owner: Daniele Moltisanti
- Privacy owner: Daniele Moltisanti
- Status: implemented boundary; privacy and release evidence incomplete

## Scope And Data Inventory

The V1 workflow processes the current Firebase UID transiently through SDK and
native adapter boundaries. It deletes the Firebase identity, encrypted backup,
local financial workspace/preferences/reminders/receipts and owner-scoped
Android candidate data. It introduces no new vendor, recipient, analytics,
telemetry, AI processing or cross-border transfer.

No UID, email, token, transaction, amount, merchant or attachment is placed in
application logs or deletion status. The UI exposes bounded phases only.

## Retention Outcomes

| Data | Outcome |
|---|---|
| Firebase Authentication identity | deleted after recent reauthentication |
| Firestore encrypted backup and three-version history | deleted before Auth identity |
| Aura localStorage and IndexedDB namespaces | deleted on the initiating device |
| Android candidate store, settings, tombstones, purge journal and applicable keys | purged through the existing total-deletion boundary |
| User-exported `.aura`/CSV files | outside Aura control; user must delete copies |
| Browser/app data on other devices | not synchronously reachable; local copies require device access/reset, while the cloud backup and identity are deleted centrally |
| Allowlist email hash/masked email | unresolved V1 retention/backend deletion gate; client authorization is intentionally not weakened |
| Retired Gemini historical records | separate retirement/retention decision; not silently deleted |

## Rights And Support

The in-app control links to the public `/account-deletion` path. A user without
an active session can authenticate there. A user unable to authenticate is
directed to `support@staituned.com`, with a response target within one week.
Manual handling requires proportionate identity verification and a redacted
case record; the exact procedure and retention are C6/C7 gates.

This record documents engineering behavior, not legal certification. The legal
source register, lawful-basis inventory, formal retention schedule and
controller/processor records are still absent and must be completed before a
GDPR-readiness or public-release claim.

## Approval Checklist

- [x] Finite deletion namespaces and ordering documented.
- [x] Recent reauthentication required.
- [x] Success withheld after any required failure.
- [x] Exported-copy limitation disclosed.
- [x] Public unauthenticated entrypoint implemented.
- [ ] Allowlist deletion/retention decision and authorized backend operation.
- [ ] Firebase emulator integration evidence.
- [ ] Physical API 36 deletion and process-recreation evidence.
- [ ] Support identity-verification and case-retention procedure.
- [ ] Privacy-owner approval against completed legal baseline.
