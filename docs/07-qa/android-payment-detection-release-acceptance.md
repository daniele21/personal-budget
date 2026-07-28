# Android Payment Detection M9 Release Acceptance

## Decision

Current decision: **not ready for general release or real-user pilot**.

M9 automated and synthetic gates are in progress. This record separates
repeatable engineering evidence from physical, legal and owner approvals that
cannot be inferred from an emulator.

## Automated Evidence — 2026-07-28

| Gate | Result | Evidence |
|---|---|---|
| TypeScript | Pass | `npm run lint` |
| Vitest | Pass | 83 files, 377 tests |
| Production web build | Pass | Vite 6.4.3 |
| Web/PWA E2E | Pass | 31/31 on Chromium, WebKit, mobile Chromium/WebKit and PWA after fixture/route repair |
| Gradle unit | Pass | `:app:testDebugUnitTest` |
| Android instrumentation | Pass | 32 tests on `Pixel_9_Pro` AVD, Android 16/API 36 |
| Android lint | Pass | 141 tasks |
| Package visibility and notification permission | Pass, emulator | Covered by API 36 manifest/instrumentation assertions |
| Listener and lifecycle recovery | Pass, emulator | Process recreation, rebind, reboot and revoke/regrant synthetic workflow |
| Rule corpus | Pass, synthetic | Duplicates, semantic dedupe, absent merchant, unsupported currency, OTP, decline, cancellation, balance and promotion |
| Owner lifecycle | Pass, engineering | Logout, owner change, reset, purge journal and encrypted Room boundary |
| Release configuration verifier | Blocked as designed | Local Google Services file is debug-only |
| Release build | Blocked as designed | Upload-key environment and production Google/OAuth configuration absent |
| Dependency audit | Blocked | 13 advisories remain; npm offers only breaking/unsafe forced changes for the production high findings |

## Physical Matrix — Required

| Scenario | Stock Android 16 | OEM Android 16 | Status |
|---|---|---|---|
| Install signed internal build | Required | Required | Open |
| Google login, resume and account switch | Required | Required | Open |
| App closed/process kill/reboot | Required | Required | Open |
| Listener revoke/regrant | Required | Required | Open |
| Lock-screen public/private notification | Required | Required | Open |
| Background restrictions/battery management | Required | Required | Open |
| Cloud backup and device-to-device transfer attempt | Required | Required | Open |
| Detection-path network capture | Required | Required | Open |
| Release logcat inspection | Required | Required | Open |
| Keystore invalidation and database failure | Required | Required | Open |
| TalkBack and switch/keyboard focus | Required | Required | Open |
| 320/360/390/430 WebView widths | Required | Required | Open |
| Light/dark and reduced motion | Required | Required | Open |

The Pixel 9 Pro AVD is useful synthetic evidence but is not a physical stock
device and cannot satisfy either physical column.

## Security And Privacy Review

Engineering review confirms:

- bundled WebView assets, exact local origin and no remote `server.url`;
- minimized bridge DTOs and bounded opaque arguments;
- package selection gate before extras;
- local AES-GCM/HMAC storage with owner isolation;
- redacted private/public Aura notifications;
- no detection network, analytics, Firebase, Gemini, archive or backup route in
  the implemented code;
- fail-closed external release signing and distinct debug/production packages.

Still open:

- physical network/log/backup proof;
- dependency advisories;
- security-owner approval;
- production signing and OAuth certificate evidence;
- privacy policy, role, lawful basis, DPIA and data inventory approval;
- whole-app Data Safety and current Play policy review.

## Rollback Acceptance

The operational sequence is documented in
[`android-payment-detection-runbook.md`](../03-operations/android-payment-detection-runbook.md).
A release owner must rehearse pause, deselection, OS revocation and Play rollout
halt on the signed internal build. The rehearsal must prove that confirmed
transactions remain intact and pending native workflow data can be purged.

## Exit Gate

M9 can close only when:

- the automated suite remains green;
- a signed production-like internal bundle passes both physical device
  columns;
- network, logcat, backup/D2D, accessibility and failure-path evidence is
  attached;
- the dependency blocker is resolved or formally risk-accepted by the
  security owner with a dated remediation;
- privacy, security and release owners sign the applicable records.
