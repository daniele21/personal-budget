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

Implemented body:

> To prepare expenses for your review, Aura will access the app source, title,
> text, and time of notifications from supported payment apps you select,
> including the amount and merchant when present. Android grants broad
> notification access at the system level, but Aura filters locally before
> reading content, does not save raw notification text, and does not send
> payment candidates off this device. Aura never creates a transaction without
> your confirmation. You can decline now, pause detection, remove apps, or
> delete pending suggestions later.

Implemented affirmative action: `Agree and continue`.

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

## Google Play Policy Review — 2026-07-28

Engineering reviewed the current official Google Play materials:

- [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311);
- [prominent disclosure and consent best practices](https://support.google.com/googleplay/android-developer/answer/11150561);
- [Spyware policy guidance](https://support.google.com/googleplay/android-developer/answer/14745000);
- [Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469).

Engineering result:

- disclosure is shown in-app immediately before Android settings;
- the user has distinct agree and decline actions;
- the copy now states why access is needed, what notification data is used and
  that detection candidates are processed locally;
- manual budgeting remains usable after decline, pause or revocation;
- notification content is not transmitted and is used only for the disclosed
  expense-preparation feature;
- package visibility is finite and no accessibility, SMS, call-log or
  `QUERY_ALL_PACKAGES` access is requested.

This is a pre-submission engineering review, not a Play approval. Google
explicitly treats stealing content from other-app notifications as spyware;
therefore any off-purpose access, hidden behavior, or transmission would be a
release blocker even with consent. The release owner must repeat the review
against the policy version current on the submission date and provide the
requested disclosure video in Play Console.

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
