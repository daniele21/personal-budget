# Android-Only Onboarding And Backup Acceptance

Date: 2026-08-04  
Decision: automated implementation gate passed; production release remains
NO-GO pending the manual and governance gates below.

## Automated Evidence

| Gate | Result | Evidence |
|---|---|---|
| TypeScript, unit/component, production build, retirement scan | Pass | `npm run test:regression`: 105 files, 503 tests |
| Bundled-runtime E2E | Pass | `npm run test:e2e`: 51/51 Chromium, WebKit, Pixel 5 and iPhone 13 emulation |
| First-run mobile and axe | Pass | one modal, required budget, persistence, no overflow, no serious/critical axe findings |
| Contextual tours | Pass | no auto-start, bounded manual tour, complete/dismiss distinction |
| Backup x5 | Pass, unit/static rules | cap, legacy migration, corruption fallback, exact restore, full indexed deletion |
| Public portal build | Pass | separate `portal-dist` artifact with responsive landing/privacy/support/deletion routes; real Aura screens cover Actual/Net safe-to-spend, budget status, 12-month category trend, month comparison and the local payment-review queue; payment candidates are synthetic and the adapter is local-serve only; desktop/mobile visual QA, no horizontal overflow and zero serious/critical axe findings |
| Android JVM | Pass | `npm run android:test` |
| Android lint | Pass | `npm run android:lint` |
| Android debug bundle | Pass | assemble phase of `npm run android:verify:webview` |

The WebView verifier stopped after a successful debug assemble because no ready
Android emulator or physical device was connected. This is an environment gate,
not a passing runtime assertion.

## Open Release Gates

- Firestore emulator rules test and production migration/rollback rehearsal for
  the five-version backup layout.
- Persistent future local-notification scheduling and reconciliation across
  reboot, app update, timezone and DST; the current bridge provides native
  permission, delivery, redaction, deep link and cancellation only.
- Android instrumentation for notification grant/deny/deliver/cancel and a
  ready-device WebView run.
- Physical stock/OEM Android matrix, TalkBack, lock-screen redaction, offline
  startup and least-capable-device memory evidence.
- Privacy-owner approval for increasing encrypted cloud retention from three to
  five recoverable versions, plus the repository legal-baseline gaps.
- Publication and availability monitoring of the public portal before hosting
  cutover; Play internal/beta/production gates remain governed by trackers 13
  and 14.

No real financial data, real-user notification source or production deployment
was used for this acceptance run.
