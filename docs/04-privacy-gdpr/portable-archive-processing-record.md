# Portable Archive Processing Record — Draft For Privacy Owner

## Status

Engineering draft, 2026-07-22. This is not an approved RoPA entry, legal interpretation, or GDPR certification.

The repository does not currently provide the legal source register, controller/processor role allocation, or approved lawful-basis register required by `AGENTS.md`. The privacy owner must review and incorporate this record into the organization’s authoritative governance system before a commercial GDPR-readiness claim.

## Processing Activity

User-initiated export and replace restore of an Aura Portable Archive V1 for local disaster recovery.

## Purpose

Allow the user to create one portable copy of the supported Aura workspace and use it to reconstruct that workspace after local data loss.

## Data Subjects And Source

- primary Aura user;
- other individuals named or described by the user in transaction, reminder, account, or receipt content.

Data is supplied by the user or derived locally from their Aura workspace.

## Personal Data Categories

- transaction amount, type, category, date, title, description, and payment method;
- account labels, institution labels, partial account identifiers, and opening balances;
- budgets, savings goals, recurring activity, categories, and monthly budget;
- reminder titles, notes, dates, and notification preferences;
- receipt images or other user-selected attachment content;
- dark-mode preference.

Authentication tokens, Firebase profile data, UID/email, cloud-backup settings, technical caches, and notification records are excluded.

## Systems, Storage, And Flow

```text
localStorage canonical data + IndexedDB attachments
→ in-browser validation/build/encryption
→ user-downloaded .aura file

user-selected .aura file
→ in-browser read/decrypt/validate/preview
→ restore-scoped IndexedDB rollback/target staging + local journal
→ verified localStorage/IndexedDB replacement
→ staging cleanup
```

No archive content is sent to Aura backend services, Firebase, Gemini, telemetry, or another recipient by this workflow.

## Recipients, Processors, And Transfers

- new recipients: none;
- new processors/subprocessors: none;
- new international transfer: none;
- cleartext vendor access: none introduced by the archive workflow.

The user may independently store or synchronize the exported file through device, browser, operating-system, email, or cloud-storage services. Those user-directed destinations are outside this feature’s technical control and must not be described as Aura-managed deletion targets.

## Security Controls

- AES-256-GCM authenticated encryption selected by default;
- PBKDF2-HMAC-SHA-256, 600,000 iterations, random per-archive salt and IV;
- explicit plaintext-risk acknowledgement;
- strict schema, size, count, reference, version, and integrity validation;
- no passphrase persistence or intentional sensitive-content logging;
- self-verification before download;
- safety-copy requirement, journal checkpoints, read-back verification, and startup recovery before provider hydration.

## Retention And Deletion

| Copy | Retention | Deletion behavior |
|---|---|---|
| Canonical local workspace | Existing Aura local retention | User local-data deletion removes managed canonical keys and attachments |
| Optional cloud backup | Existing cloud-backup retention | Existing cloud-backup deletion flow |
| Exported `.aura` file | User controlled | Aura cannot locate or delete a user-exported copy |
| Restore previous/target staging | Until verified completion or verified rollback | Deleted immediately after successful verification/rollback |
| Failed recovery staging/journal | Until recovery is resolved | Preserved because deletion would remove rollback evidence |
| Passphrase/derived key | Operation memory only | Not persisted by design |

## Data-Subject Rights Engineering Notes

- access: the archive contains the supported local workspace, but is not asserted to be the organization’s complete access-response package;
- portability: `.aura` is application-specific disaster recovery, not a claim of statutory interoperability;
- rectification: an older archive may replace newer corrections only after explicit confirmation;
- erasure: managed local/cloud copies can be deleted, but previously exported user copies cannot;
- restriction/objection: role and lawful-basis analysis is pending and must define the applicable handling process.

## Role And Lawful Basis — Approval Required

- controller/processor role: **not defined in the repository; privacy owner required**;
- lawful basis: **not defined in the repository; privacy/legal owner required**;
- contractual/controller instructions: **not available in the repository**;
- end-of-contract handling: managed copies follow existing product processes; user-exported copies remain outside Aura control.

## DPIA Screening — Approval Required

Engineering found no new systematic monitoring, automated decision-making, recipient, AI processing, or backend aggregation in this workflow. The activity does include financial information and receipt content, so the privacy owner must confirm DPIA screening against the organization’s approved criteria and current legal baseline.

## Owner Actions Before General Release

- approve controller/processor role and lawful basis;
- add or map this activity into the authoritative RoPA/data inventory;
- confirm retention and data-subject-rights wording;
- confirm DPIA screening outcome;
- confirm user-facing deletion/export disclosures;
- restore or identify the missing repository legal source register referenced by `AGENTS.md`.
