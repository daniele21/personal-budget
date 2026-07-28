# Android Payment Detection — Play And Disclosure Draft

## Status And Ownership

Status: engineering draft, not approved for publication.

Required approvers: privacy owner, security owner and release owner. The
repository has no legal-source register, so this document cannot close lawful
basis, DPIA, Google Play policy or legal wording.

This draft covers the payment-detection delta only. The release owner must
complete Google Play Data Safety from the behavior of the whole production
app, including existing authentication, optional cloud backup, archive,
support and any production SDKs.

## Prominent Disclosure Draft

Suggested heading:

> Prepare expenses from payment notifications

Suggested body:

> If you turn this on, Aura can read notifications from only the payment apps
> you select to prepare an expense for your review. Processing happens on this
> device. Aura does not save notification text, card or account numbers, and
> it does not add a transaction until you confirm it. You can pause detection,
> remove apps, delete pending suggestions, or revoke notification access at
> any time.

Suggested affirmative action: `Continue to Android settings`.

Required presentation:

- immediately before opening Android notification-access settings;
- separate from terms, privacy-policy acceptance and account login;
- no preselected app and no permission request caused by navigation;
- a visible cancel action that keeps the feature off;
- supported-app selection only after the OS grant;
- link to the current privacy policy and deletion controls.

The final screenshots must use synthetic values and show the permission
purpose, selected-app scope, review step and deletion/pause controls. They must
not show real financial data or imply automatic ledger posting.

## Data Safety Engineering Input

Detection-path facts to map into the final whole-app declaration:

| Topic | Detection-path behavior | Release evidence still required |
|---|---|---|
| Financial candidate | Structured amount, EUR currency, optional merchant and timestamp are processed and encrypted locally | Physical network capture and production build inspection |
| Notification text | Bounded in memory for deterministic parsing; never persisted | Physical/logcat verification |
| App inventory | Finite supported packages and user selections are used locally | Final manifest/package-visibility review |
| User identifier | Firebase UID is transiently transformed into a Keystore-backed owner boundary; UID is not stored in candidate records | Production auth/signing verification |
| Sharing | No detection candidate, raw notification or app selection is shared | Whole-app SDK and network review |
| Deletion | Ignore, accept, logout, account change, reset and total deletion purge applicable native records | Physical lifecycle and error-path QA |
| Backup | Candidate database, settings and keys are excluded; `allowBackup=false` | Physical stock/OEM cloud and D2D attempt |
| Security | AES-GCM, HMAC owner isolation, bundled WebView, CSP, no cleartext, release shrinking/log stripping | Signed release inspection |

Do not infer the whole-app Play Console answers from the local-only detection
path. Existing Firebase authentication and optional user-controlled cloud
backup must be evaluated separately.

## Store Copy Draft

> Aura can optionally prepare an expense from notifications posted by payment
> apps you choose. Suggestions stay on your device and wait for your review;
> Aura never posts a transaction automatically. Notification access is
> optional and can be paused or revoked without affecting manual budgeting.

Avoid claims such as “reads only payment notifications” because Android grants
listener access at service level. The accurate statement is that Aura applies
an in-app package gate before reading notification fields and processes only
explicitly selected supported packages.

## Approval Evidence

- [ ] Production privacy policy names notification access, purpose, local
  processing, retention, controls and rights handling.
- [ ] Privacy owner records controller/processor role and lawful basis.
- [ ] Privacy owner completes DPIA screening.
- [ ] Security owner approves package gate, bridge, backup, logs and network
  evidence.
- [ ] Release owner maps whole-app behavior into Play Data Safety.
- [ ] Release owner approves prominent-disclosure placement and exact copy.
- [ ] Play policy review uses the policy version current at submission time.
- [ ] Screenshots use only synthetic content.
- [ ] Play App Signing, developer verification and support contact are active.
