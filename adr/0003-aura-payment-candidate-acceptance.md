# ADR 0003: Idempotent Payment Candidate Acceptance

- Status: Accepted
- Date: 2026-07-25
- Owners: Aura Finance maintainers
- Delivery tracker: [`docs/00-discovery/11-android-payment-detection-progress-plan.md`](../docs/00-discovery/11-android-payment-detection-progress-plan.md)
- Related: [`ADR 0002`](./0002-aura-android-capacitor-runtime.md)

## Context

Android payment detection must persist candidates while the React WebView is closed. Room is therefore the native source of truth for candidate workflow state.

Aura transactions remain canonical `AppData` records persisted through the React repository and reducer flow. Native code must not write WebView localStorage.

Accepting a candidate consequently crosses two stores:

```text
Room PaymentCandidate
→ React transaction action
→ localStorage AppData
```

Room and localStorage cannot participate in one atomic transaction. A crash between transaction creation and candidate completion could create a duplicate or leave the candidate permanently pending.

The design must be idempotent without retaining bank package, rule, fingerprint, or candidate metadata indefinitely in every transaction.

## Decision

### Candidate And Transaction Remain Separate

`PaymentCandidate` is a short-lived native workflow record. It is never added to `AppData`.

A confirmed payment becomes a normal Aura `Transaction` with the existing canonical shape. The ledger does not persist:

- candidate ID;
- bank package;
- notification fingerprint;
- matched rule;
- confidence or match tier;
- notification-derived card or account data.

### Begin Acceptance Reserves The Transaction ID

The native plugin exposes an idempotent operation conceptually equivalent to:

```ts
beginAcceptance(candidateId: string): Promise<{
  acceptanceToken: string;
  reservedTransactionId: string;
  candidate: PaymentCandidateReviewDto;
}>;
```

Native behavior:

1. load the pending candidate for the active owner;
2. if already `accepting`, return the same active reservation;
3. generate a cryptographically random UUID for the future transaction;
4. generate a one-time acceptance token;
5. persist `accepting`, the reserved transaction ID, and a hash of the token in one Room transaction;
6. return a minimized candidate snapshot, token, and reserved ID.

React uses `reservedTransactionId` as the normal `Transaction.id`.

No additional detection-specific field is added to `Transaction`.

### Commit Sequence

```text
beginAcceptance
→ validate/edit review
→ dispatch transaction creation with reservedTransactionId
→ persist canonical AppData
→ read AppData back and verify transaction ID
→ completeAcceptance
```

`completeAcceptance(candidateId, acceptanceToken)`:

- verifies active owner;
- verifies the token using its stored hash;
- requires candidate state `accepting`;
- transitions the record in one Room transaction;
- deletes merchant and other candidate payload;
- retains only the minimum dedupe tombstone and expiry;
- is safe to repeat after successful completion.

React must not show success before canonical persistence has been read back.

### Recovery

On cold start and resume, React requests acceptance recovery before showing pending candidates.

For every `accepting` record:

- if `AppData.transactions` contains `reservedTransactionId`, call completion again;
- if it does not contain the ID and the reservation is not currently being processed, return the candidate to `pending`;
- if canonical data cannot be read safely, leave `accepting` unchanged and show a recoverable error;
- never create a second transaction with a different ID for the same active reservation.

An invalid or expired token does not delete or accept a candidate.

### Deduplication

Two forms of dedupe remain native:

- technical fingerprint for repeated updates of the same Android notification;
- semantic fingerprint for the same operation observed from multiple allowed sources.

The semantic fingerprint is a strong-match mechanism. It normalizes merchant
case, accents, punctuation, and whitespace, but it does not remove words or
provider prefixes. Automatic suppression still requires the same operation,
amount, currency, normalized merchant, a different source, and the bounded
native time window. Missing or materially different merchants are never fused
automatically.

Possible duplicates remain a review concern rather than a persistence
constraint. While the candidate editor is open, React compares the selected
candidate in memory with:

- pending candidates with the same operation, amount, currency, and a posting
  time within five minutes;
- existing expense transactions with the same amount and local calendar day.

These weak matches are not persisted, backed up, or added to the canonical
transaction. Aura shows their source/title and requires an explicit `Create
anyway` confirmation. Editing the candidate amount or date clears an assessment
that no longer describes the edited values. A global ledger uniqueness rule is
rejected because legitimate repeated purchases can share amount, date, and
merchant.

After acceptance:

- the candidate payload is deleted;
- the accepted tombstone retains only fingerprint, status, owner partition, timestamps, and expiry;
- the tombstone does not enter `AppData`, cloud backup, portable archive, Android backup, or analytics.

Initial retention:

- ignored payload: delete immediately, tombstone 7 days;
- accepted or edited payload: delete after verified commit, tombstone 30 days;
- pending: expire after 14 days.

Changing retention requires privacy documentation and regression tests.

### Ownership

Every candidate, reservation, and tombstone belongs to an `ownerKeyHash` derived one-way from the active Firebase UID and an app-local namespace.

- UID, email, or token is never logged.
- Detection is suspended when no active owner is registered.
- Logout, account change, local reset, and total deletion purge the previous owner's native data.
- The plugin rejects IDs belonging to another owner.

### Failure Handling

- Room write failure: do not notify or begin acceptance.
- AppData persistence failure: keep `accepting`; recovery may return it to `pending`.
- Candidate expired during review: block commit and refresh.
- Transaction ID collision: treat as an invariant failure unless the existing ID is the verified reservation target.
- Keystore failure: purge unreadable sensitive payload, preserve no misleading candidate, and show a privacy-safe error.
- Complete call repeated: return success if the same reservation already completed.

## Consequences

### Positive

- Native and web stores keep clear ownership.
- Crashes do not create duplicate transactions.
- `Transaction` and archive schema do not gain detection metadata.
- Dedupe data expires independently from the financial ledger.
- Recovery can use the existing canonical transaction ID.
- Cloud backup and portable archive remain unaware of pending native workflows.

### Negative

- Acceptance needs explicit begin, verify, complete, and recovery states.
- React must confirm persisted read-back rather than assuming reducer completion.
- Native Room stores a short-lived reserved transaction ID and token hash.
- Logout/reset orchestration spans web and native repositories.

## Alternatives Rejected

### Native Writes Directly To LocalStorage

Rejected because it creates an unsupported second writer to canonical financial state and bypasses validation, reducer behavior, archive compatibility, and React lifecycle.

### Add Candidate Metadata To Transaction

Rejected because package, rule, and fingerprint data would outlive the workflow and enter backup/archive without sufficient product value.

### Add Only `sourceDetectionId`

Rejected because reserving the normal transaction ID provides the same recovery key without a schema change.

### Delete Candidate Immediately After Dispatch

Rejected because dispatch does not prove persistence and a crash could lose recovery information.

### Keep Accepted Candidates Forever

Rejected because dedupe requires only a bounded tombstone, not indefinite payment detail retention.

### Best-Effort Dedupe By Amount And Date In React

Rejected because it is ambiguous, unavailable while the WebView is closed, and can incorrectly merge legitimate payments.

## Verification

Required fault-injection cases:

- crash before `beginAcceptance`;
- crash after reservation but before React dispatch;
- crash after dispatch but before persistence;
- crash after persistence but before complete;
- repeated begin and complete calls;
- invalid and expired token;
- logout during review;
- account switch with an active reservation;
- reset during review;
- transaction ID collision;
- duplicate callbacks before and after acceptance;
- archive export and cloud backup while a candidate is pending or accepting.

The milestone is complete only when every state has deterministic recovery evidence.
