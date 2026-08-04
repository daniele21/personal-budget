# ADR 0004: Payment Detection Beta-Only For The Initial Release

- Status: Accepted
- Date: 2026-08-04
- Owner: Daniele Moltisanti
- Decision pack: [`docs/00-discovery/15-c2-release-decision-pack.md`](../docs/00-discovery/15-c2-release-decision-pack.md)
- Related: [`ADR 0002`](./0002-aura-android-capacitor-runtime.md), [`ADR 0003`](./0003-aura-payment-candidate-acceptance.md)

## Context

Aura's notification-based payment detection is implemented and automatically
verified with a controlled synthetic source, but real-user privacy, physical
device, Play policy and pilot evidence remain open.

The core Android product can progress independently from notification access.
Shipping the listener in the first production build would couple the entire
release to a sensitive permission and to evidence that is not yet complete.

The release must decide whether payment detection is included in the first
production build, restricted to beta, or removed entirely.

## Decision

Payment detection is beta-only for the initial release program.

Release capability matrix:

```text
debug/local       → synthetic notification source allowed
Play Internal     → synthetic source only until real-source gates close
closed beta       → listener allowed only after M9/C6 approval and per-user opt-in
initial production → core-only build; listener and payment-source visibility absent
```

The initial production variant must not declare the
`NotificationListenerService`, notification-listener binding permission,
payment-source package visibility, synthetic source or production payment
rules. Merely hiding React UI is insufficient.

Confirmed transactions created during an authorized beta remain normal Aura
transactions and continue to work in the core production build. Pending native
candidates are not promoted or migrated into production.

Adding payment detection to production later requires:

- M9 and M10 exit gates from the payment-detection tracker;
- privacy/security owner approval;
- Play disclosure, Data Safety and physical-device evidence;
- a new dated product/release decision and amendment or supersession of this ADR.

## Consequences

### Positive

- Core production is not blocked by notification-access readiness.
- The production manifest and Play declarations have a smaller sensitive scope.
- Beta stop conditions can disable or withdraw detection without withdrawing
  the core product.
- No real notification access is implied by publishing Aura core.

### Negative

- Android builds need an explicit, tested capability/manifest split.
- Internal, beta and production matrices differ.
- Release verification must prove absence, not only disabled UI.
- Users moving from beta to production lose access to pending candidates; this
  must be disclosed and tested without affecting confirmed transactions.

## Alternatives Rejected

### Include Detection In The First Production

Rejected because M9/M10, privacy, Play and physical evidence are not complete.

### Ship The Listener Disabled Behind UI

Rejected because the sensitive service and package visibility would still be
present in the production artifact and declarations.

### Remove Payment Detection From The Product

Rejected because a controlled beta remains useful for validating the approved
local, deterministic workflow.

## Verification

- merged production manifest contains no listener service or synthetic source;
- production AAB contains no synthetic package/rules or beta-only UI entrypoint;
- beta build remains off-by-default and requires disclosure;
- PWA remains unaffected;
- confirmed beta transactions remain canonical and readable in core production;
- artifact verifier fails when beta-only markers enter the production variant.
