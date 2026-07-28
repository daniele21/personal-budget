# Android Payment Detection MVP

## Status

- Product direction: approved
- Architecture: accepted in ADR 0002 and ADR 0003
- Implementation: synthetic M4-M8 slices complete; M1-M3 retain their
  production, lifecycle, physical, and governance closure gates; M9
  hardening and physical/compliance closure remain pending
- Current gate: M9 may proceed with synthetic candidates; real
  sources remain blocked by the privacy, fixture, security, and pilot gates
- Delivery tracker: [`11-android-payment-detection-progress-plan.md`](../00-discovery/11-android-payment-detection-progress-plan.md)

## Product Promise

On supported Android devices, Aura can optionally recognize a likely EUR card payment from a notification posted by a payment app the user selected. Aura prepares a local candidate, asks the user to verify or edit it, and creates a normal transaction only after explicit confirmation.

Aura does not promise:

- universal bank support;
- statement reconciliation;
- proof that a payment has settled;
- automatic bookkeeping;
- detection of salary, transfer, P2P, SMS, or cash activity;
- iOS notification access.

## Distribution Contract

- The PWA remains supported.
- Android is a Capacitor companion using the shared React/Vite build.
- Payment detection is visible as supported only on Android.
- The PWA may show an informational Android availability entry once a stable store link exists.
- Android production uses bundled assets, not a remote-hosted WebView.

## MVP Scope

Included:

- Android 16/API 36 only in the first release;
- min/target/compile API 36;
- feature off by default;
- prominent disclosure;
- Android notification-access settings;
- finite supported-package catalog;
- user selection per installed supported app;
- EUR card payments;
- native offline parser;
- exact and review match tiers;
- negative rules;
- amount, currency, optional merchant, and timestamps;
- Room candidate queue;
- private Aura notification;
- verify, edit, ignore, disable, revoke, and delete;
- idempotent canonical transaction creation;
- internal and closed-beta rollout.

Excluded:

- card suffix, card number, account number, balance, OTP;
- generic income or bank transfer;
- reimbursement in the first pilot rule set;
- remote rules;
- telemetry tied to candidates;
- AI or Gemini;
- backend parsing;
- Open Banking;
- Accessibility Service;
- SMS;
- automatic transaction creation;
- cloud sync or archive of pending candidates;
- persistent merchant-category learning.

## User Journey

### Unsupported Web/PWA

1. Aura runs normally.
2. Payment detection is not initialized.
3. Once an Android store link exists, Data & Privacy may explain that the optional feature is available in the Android app.

### First Android Setup

1. User opens Payment Detection.
2. Aura explains that Android grants notification access to Aura as a listener.
3. Aura explains that its code filters unsupported and unselected apps before reading notification text.
4. Aura explains local parsing, short retention, no server/AI/analytics, and deletion controls.
5. User performs a distinct affirmative action.
6. Aura opens Android notification-access settings.
7. On return, Aura shows only installed apps from the finite supported catalog.
8. User selects at least one app.
9. Detection becomes active for the current Aura owner.

Navigation away, back press, permission denial, or closing Aura does not count as consent.

### Candidate Detection

1. Android posts a notification callback.
2. Aura checks feature enabled.
3. Aura reads package name.
4. Aura checks supported catalog and user selection.
5. Aura returns before notification extras if either check fails.
6. Aura reads title/text/bigText only for allowed packages.
7. Aura applies normalization and rules off the main thread.
8. Aura releases raw text references.
9. Aura persists only a structured candidate if the match tier permits it.
10. Exact-tier candidates may trigger a private Aura notification.
11. Review-tier candidates appear only in the in-app queue.

### Review

The user can inspect and change:

- amount;
- title or merchant;
- category;
- local calendar date;
- payment method;
- expense treatment.

Category and payment method start from the existing Add Transaction defaults, not from persistent merchant learning. Both remain visible and editable before confirmation.

`occurredAt` defaults to the Android notification post time. A rule may replace it only for a verified app-specific timestamp format. React converts the instant to the device's local calendar date using the same canonical mapping as manual Add Transaction, without a UTC day shift.

The review shows:

- source app display name;
- that values were detected from a notification;
- no numerical confidence;
- no card or account metadata.

### Acceptance

1. React calls `beginAcceptance`.
2. Native returns candidate snapshot, acceptance token, and reserved transaction UUID.
3. React validates the edited form.
4. React creates a normal transaction using the reserved UUID.
5. Canonical persistence is read back and verified.
6. React calls `completeAcceptance`.
7. Native removes candidate payload and retains a bounded dedupe tombstone.
8. Aura shows success.

### Ignore

- Ignore creates no transaction.
- Candidate payload is deleted immediately.
- A seven-day tombstone prevents the same notification from being proposed again.

### Disable And Delete

The user can:

- pause detection;
- remove one selected app;
- delete all candidates and tombstones;
- open Android settings to revoke access;
- reset all local Aura data.

Logout, owner change, local reset, and total deletion suspend detection and purge native candidate data.

## Match Contract

Processing order:

```text
feature enabled
→ package supported
→ package selected
→ normalize
→ negative rules
→ exact/positive rules
→ amount
→ optional merchant
→ match tier
→ dedupe
```

Match tiers:

- `exact`: a fully recognized app-specific template with required amount and no negative signal;
- `review`: supported financial pattern with required amount but insufficient exactness for a notification;
- `ignored`: negative, incomplete, unsupported, invalid, duplicate, or expired.

Only `exact` may create an Aura notification. `review` remains in the queue.

Negative examples:

- OTP or verification code;
- login/security alert;
- available balance;
- declined payment;
- cancelled/reversed authorization outside the approved reimbursement scope;
- promotion;
- transfer or incoming payment;
- amount without a supported payment context.

## Data Contract

Persisted candidate:

- random candidate ID;
- owner hash;
- internal source app ID;
- encrypted and authenticated payload containing operation type, amount in minor units, EUR, optional merchant, and occurrence timestamp;
- detection timestamp;
- match tier;
- rule ID/version;
- technical and semantic hash fingerprints;
- status, expiry, and optional acceptance reservation.

Never persisted:

- raw notification strings;
- normalized full text;
- OTP;
- balance;
- card/account identifiers;
- Firebase token or email.

The final transaction contains no detection-specific metadata. Its normal UUID is reserved by the native acceptance workflow.

## Retention

- raw input: parsing duration only;
- pending candidate: 14 days;
- ignored payload: immediate deletion, tombstone 7 days;
- accepted/edited payload: deletion after verified transaction persistence, tombstone 30 days;
- expired payload/tombstone: automatic deletion;
- settings: until disable, logout, owner change, or reset as applicable.

## Notification Privacy

Default lock-screen representation:

```text
Aura
Nuovo pagamento da verificare
```

The expanded private notification may show merchant and amount only when device privacy state and user preference allow it.

No bank package, card information, account information, or raw bank text appears in the notification.

## Error Behavior

- Permission missing: detection unavailable; existing local queue remains manageable.
- Database failure: no Aura notification and no crash loop.
- Invalid rule: disable that rule and continue safely.
- Missing amount: ignore.
- Unsupported currency: ignore.
- Missing merchant: allow review with source app as fallback title.
- Candidate missing/expired: explain and refresh.
- Keystore failure: purge unreadable payload and show a privacy-safe error.
- Acceptance interrupted: run ADR 0003 recovery before accepting another candidate.

## Privacy And Security Requirements

- No network call from the detection path.
- No Android Auto Backup or D2D transfer of Aura data.
- No broad package visibility.
- No production dynamic logs.
- No raw bridge API.
- Bundled production web assets.
- Internal, non-exported service helpers and receivers.
- Immutable PendingIntent where possible.
- Owner isolation and purge.
- Honest prominent disclosure before settings.
- DPIA screening and privacy-owner approval before real-user testing.

## Acceptance Criteria

The MVP is acceptable when:

1. PWA remains functional and independent.
2. Android app starts from bundled assets.
3. Feature is off by default.
4. No notification content is read before package allow checks.
5. Only user-selected supported apps are processed.
6. Raw content is never persisted, logged, transmitted, or backed up.
7. OTP, balance, card, and account data are not collected.
8. Exact valid fixture creates one candidate.
9. Review fixture creates no immediate Aura notification.
10. Negative fixtures create no candidate.
11. Duplicate callbacks create no duplicate candidate or transaction.
12. Candidate survives process restart.
13. Review can edit and confirm a normal transaction.
14. Interrupted acceptance recovers deterministically.
15. Ignore creates no transaction.
16. Logout, owner change, reset, and delete purge native data.
17. Pending candidates do not enter backup or archive.
18. Lock screen is redacted by default.
19. Network and logcat leakage checks pass.
20. Physical-device, accessibility, privacy, security, and Play release gates pass.

## Pilot Gate

The technical spike uses only a synthetic source.

A real app can enter the closed beta only when:

- package identity is verified;
- the user or tester intentionally participates;
- fixtures are redacted and approved;
- every rule has positive, negative, and ambiguous cases;
- exact-tier precision is at least 95% in the approved corpus;
- no OTP/security notification is misclassified;
- the privacy and release owners approve the app-specific disclosure and evidence.
