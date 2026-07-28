# Android Payment Detection Pilot Runbook

## Status

Pilot status: **blocked; preparation only**.

M10 cannot start until M9 physical QA is complete and gates B-001, B-002,
B-003, B-005 and B-006 in the Android progress tracker are closed. In
particular, this runbook does not authorize real notification processing,
collection of real fixtures, Play distribution or a beta.

## Entry Checklist

- [ ] Named product, QA, security, privacy and release owners.
- [ ] Privacy owner records role allocation, lawful basis, data inventory and
  DPIA screening.
- [ ] Security owner approves physical network, logcat, backup/D2D and bridge
  evidence.
- [ ] Release owner configures Play App Signing, upload-key custody,
  production Firebase/OAuth and internal-testing access.
- [ ] One real source package and exact notification template are verified
  through the approved redaction process.
- [ ] Stock Android 16 and one representative OEM device pass M9.
- [ ] Production dependency audit is green or has a dated security-owner risk
  acceptance and remediation deadline.
- [ ] Privacy policy, Data Safety, disclosure screenshots and review video are
  approved.

If any item is open, only the controlled synthetic source may be used.

## Phase A — Internal Build

Distribution is restricted in Play Console to named development/tester
accounts. The app itself must not embed personal UID/email allowlists.

Rules:

- one approved source only;
- exact template only; review-tier outputs do not count toward release
  precision;
- no custom analytics, candidate telemetry or automatic attachments;
- feedback uses the redacted form below;
- every tester verifies pause, OS revocation and pending-candidate deletion;
- any sensitive false positive or leakage stops the test immediately.

Exit evidence:

- signed build/version and tester group;
- device/build matrix;
- exact true positives, exact false positives and missed eligible events;
- edited suggestions count;
- duplicate outcomes;
- rollback rehearsal result;
- zero raw content in submitted evidence.

## Phase B — Closed Beta

Before inviting each participant:

1. provide the approved participant notice;
2. keep detection off;
3. show the in-app disclosure;
4. record the participant's explicit opt-in through the normal product flow;
5. allow selection of only the one or two approved sources.

The participant may report an outcome voluntarily but Aura must not attach a
notification, screenshot, candidate ID, fingerprint, account identifier or
financial value automatically.

## Phase C — Production Opt-In

Production rollout requires:

- exact-tier precision at least 95%;
- exact-tier false positives at most 2%;
- zero sensitive false positives;
- zero duplicate canonical transactions;
- zero detection-path network calls or raw log/backup records;
- Play review, Data Safety and privacy/security/release approvals;
- a staged percentage rollout with Play Vitals review.

No remote rules or remote kill switch are permitted. Disablement is performed
through pause/deselection/revocation, rollout halt, or a replacement release.

## Redacted Feedback Record

Allowed fields:

| Field | Values |
|---|---|
| Build | version code/name |
| Device | model and Android build |
| Source | approved internal source ID, not package from an unapproved app |
| Expected outcome | exact candidate / ignored / no candidate |
| Actual outcome | exact / review / ignored / missed |
| User action | accepted / edited / ignored |
| Duplicate | yes/no |
| Timing bucket | under 1 s / 1-3 s / over 3 s |
| Notes | structural wording only, no notification content or financial value |

Do not record title, text, amount, merchant, timestamp, notification key,
candidate ID, Firebase UID/email, screenshots or tokens.

Precision is `true exact candidates / all exact candidates`. Recall may be
tracked as `eligible detected events / all manually identified eligible
events`. Both require an approved manually classified denominator.

## Stop Conditions

Stop the pilot immediately for:

- content read from an unselected package;
- OTP, balance, declined/cancelled payment or other sensitive false positive;
- candidate content in logs, network, backup, crash report or feedback;
- cross-account candidate visibility;
- duplicate canonical transaction;
- inability to pause, revoke or purge;
- unexplained database/Keystore recovery behavior;
- Play or privacy-owner request.

Follow the incident and rollback sequence in
[`android-payment-detection-runbook.md`](./android-payment-detection-runbook.md).

## Rollback Rehearsal

For each signed pilot build:

1. pause detection;
2. deselect the source;
3. revoke notification access;
4. confirm no new candidate appears;
5. delete pending candidates;
6. confirm existing ledger transactions remain;
7. halt the Play rollout;
8. verify the hosted PWA remains available and independent.

Record only pass/fail and the build/device metadata.
