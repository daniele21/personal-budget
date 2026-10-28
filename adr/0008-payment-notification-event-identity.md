# ADR 0008: Distinguish Payment Events from Reused Android Notification IDs

- **Status:** Proposed — implementation and privacy/migration approval pending
- **Date:** 2026-10-28
- **Tracking:** [R2 issue #62](https://github.com/daniele21/personal-budget/issues/62), [reliability plan R2](../docs/00-discovery/17-payment-detection-reliability-recovery-plan.md)
- **Related:** [ADR 0003 — candidate acceptance](./0003-aura-payment-candidate-acceptance.md), [payment-detection specification](../docs/specs/android-payment-detection-mvp.md)
- **Scope:** Android notification-listener → Room candidate identity; no ledger transaction schema change

## Observed failure and boundary

In Room v1, `CandidateFingerprintHasher.hashTechnical(owner, sourceAppId, notificationKey)` is a single unique fingerprint. `PaymentCandidateRepository.persist()` updates the payload of any `pending` candidate with that fingerprint, even if amount and merchant differ, and returns `Duplicate` for an accepted/ignored tombstone with that fingerprint.

This gives correct idempotency when Android updates **one** notification, but can overwrite/suppress a **different** payment if a source reuses its notification key. Such reuse has **not yet been observed conclusively for Intesa or Wallet on the tester's phone**. Android's notification API supports reposting with the same tag/id to replace an existing notification, so a notification key alone is not a trustworthy payment ID.

The current `PaymentDetectionResult.Candidate` carries a source, operation, amount, EUR currency, optional merchant and occurrence timestamp (normally `StatusBarNotification.postTime`). No bank transaction reference is part of the trusted native domain. The source notification timestamp is not guaranteed to be the financial transaction's business timestamp.

## Proposed decision, subject to implementation contract review

**Prioritize not losing a distinct payment over silent deduplication of an ambiguous update.** Neither a unique `notificationKey` nor a coincidental amount+merchant should be considered proof of the same financial operation.

1. Preserve the **source notification family** separately from each **candidate event revision**. Use keyed HMAC, never raw notification key or raw extras in Room. A source key can correspond to more than one candidate event.
2. Treat exact repeated observations of an existing event revision as idempotent, even after process death and after user acceptance/ignore, for the existing retention window.
3. A changed amount, operation/currency, meaningful merchant or separated post time under the same source key is **evidence for a possibly different payment**. Do not silently replace a previously accepted/ignored record. In ambiguous cases create a distinct **reviewable** pending candidate instead of an automatic transaction. This is preferable to irrecoverable loss but can produce extra review items when a bank updates one event.
4. When a legitimate source update to an existing pending candidate can be established with strong evidence (e.g. stable event ID + equivalent transaction fields under a bounded update window), update in place. Weak equality of date/amount/merchant alone is **not** sufficient to suppress a second payment. A changed amount is not automatically classified as a new **confirmed** transaction.
5. Preserve cross-source semantic dedupe as currently contracted: same operation, amount, currency, normalized merchant, **different source** and bounded native two-minute window. Do not make same-source merchant/amount pairs globally unique.
6. Continue to notify only for `Created` candidates; retain explicit user confirmation, duplicate-review UX and encrypted candidate payload. Do not add any detection metadata to canonical AppData transactions.

## Proposed Room v2 data and migration strategy

The owning implementation should introduce **versioned** fingerprints instead of silently changing the meaning of existing `technicalFingerprint`:

- `sourceNotificationFingerprint`: HMAC keyed with owner/source/Android notification key (equivalent to v1 technical fingerprint), used to find prior notification-family events.
- `technicalFingerprint`: HMAC of a versioned, canonical event identity derived only from allowed structured fields and source event metadata. An exact replay yields the same fingerprint. Unique index retains its owner boundary.
- Keep only necessary metadata under the existing retention. Never store raw text or keys.
- Migration **1 → 2** must be additive, preserve encrypted payloads, owner hashes, accepted/ignored tombstones, acceptance tokens and reserved transaction IDs. Existing v1 `technicalFingerprint` values must remain queryable; backfill `sourceNotificationFingerprint` from the v1 value. Do not use destructive migration.
- For pre-upgrade tombstones there is no remaining payment payload, so identical vs different later event **cannot be proven** from old data. Define and test bounded legacy-replay compatibility; document any remaining ambiguity rather than suppressing every later payment with the same key.
- Export the v2 Room schema, add `MigrationTestHelper` test using real exported v1 schema, and run migration + acceptance/owner isolation tests with encryption keys and live pending rows.
- Do not persist raw merchant, amount, notification key, event body or unredacted diagnostic data in new columns. Add independent privacy review of any event-time metadata stored outside ciphertext.

**Design constraint:** There is not enough trustworthy evidence from the Android notification API to guarantee that two identical postTime/amount/merchant observations represent the same financial operation, nor that a changed postTime means a new payment. Define an explicit, conservative bounded ambiguity policy and label its residual false-duplicate/false-suppression risk in the release record. Avoid a heuristic presented as a mathematical guarantee.

## Required test matrix before approval/merge

| Scenario | Expected safety behavior |
|---|---|
| Exact callback replay (same key, fields, postTime) | One candidate, no second alert |
| Selected notification update with same payment identity | Same candidate updated only when evidence is strong |
| Two different amounts with reused key | Distinct reviewable events; never silently replace a confirmed/ignored purchase |
| Same key and same amount/merchant at materially different event times | Do not suppress a clearly separate later purchase merely on key/merchant |
| Two purchases within minutes, possibly same merchant | No automatic ledger merge; review ambiguity explicitly |
| Cross-source Wallet + bank for one payment | Conservative semantic suppression under current two-minute contract |
| Replayed event after accepted/ignored status | Idempotent within retention and event identity |
| Legacy v1 pending/accepting/accepted/ignored rows | Non-destructive migration and no owner data leakage |
| Process death, repeated rebind and concurrent callbacks | Transactional uniqueness, idempotent user acceptance |
| Keystore loss, purge/logout/account switch | Existing privacy fail-closed contract preserved |

## Rejected shortcuts

- **Just hash `notificationKey + amount`:** loses same-amount later purchases and causes duplicates when a single notification's amount is corrected.
- **Just hash `notificationKey + postTime`:** an update may change postTime while still representing one payment; same-postTime distinct data remains ambiguous.
- **Just skip dedupe:** creates noise and risks accidental repeat acceptance despite a human review step.
- **Add detection fields to AppData transactions:** violates ADR 0003 and leaks transient native data into archive/backup.
- **Clear the Room database to fix the index:** destroys pending work and tombstone continuity.
- **Trust a bank-specific transaction ID without a validated format:** notification descriptions are not a stable transaction protocol.

## Approval / next action

**Not an approved behavioral contract yet.** Review with Android/QA/privacy owners before modifying Room schema or changing the existing approved update semantics. After the edge-case ambiguity policy is settled, implement R2 in one coherent PR (fingerprints, DAO, migration, repository, listener consumers, tests, runbook). Run **STRONG** exact-HEAD automated gates in GitHub; retain **REAL_ENVIRONMENT** testing for actual Intesa/Wallet reuse patterns and OEM lifecycle. Do not claim the original all-zero diagnostics incident was caused by key reuse without evidence.
