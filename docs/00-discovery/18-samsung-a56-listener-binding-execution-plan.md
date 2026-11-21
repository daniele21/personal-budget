# P0 — Samsung Galaxy A56: Android payment-listener binding recovery

**Date:** 2026-11-21  
**State:** Execution plan; no root-cause fix implemented, no release authorized  
**Baseline:** `main@cbe41b7da8ae581de9609243f8248875258b5c59` (product code in Aura 1.0.26, merged PR #74; #75 is release documentation only)  
**Incident:** [#68](https://github.com/daniele21/personal-budget/issues/68)  
**Physical acceptance:** [#65](https://github.com/daniele21/personal-budget/issues/65)  
**Broader recovery plan:** [17-payment-detection-reliability-recovery-plan.md](./17-payment-detection-reliability-recovery-plan.md)  
**Separate, non-blocking event-identity work:** [#62](https://github.com/daniele21/personal-budget/issues/62)

> This is a focused execution addendum to plan 17, not a reset of its existing R0–R4 contracts. Source-of-truth product implementation and signed 1.0.26 release evidence govern when older planning prose is obsolete. The tester's observed failure mode is not yet an Android/Samsung root-cause finding.

## 1. Verified evidence and fault boundary

On a Samsung Galaxy A56 on 21 November 2026, private screenshots of Aura's **Payments to review** screen (not attached to the repo) showed:

- At approximately 15:52 local time: `Android framework V2 approval: Yes`, `V2 service enabled: Yes`, `Android background restricted: No`; UI `Listener not binding`.
- At 15:49 a fresh native refresh reported `lastRecoveryResult=BIND_REQUESTED` with 4 recovery attempts, 0 current/legacy connections and 0 V2 service starts.
- At approximately 16:16 a later diagnostic interval showed **25 recovery attempts**, **0 V2 and legacy service starts**, **0 V2 and legacy connection callbacks**, **0 supported-app callbacks** and **0 successful or failed active-notification snapshots** (visible counter values in the capture). These are **process-/owner-scoped counters**, not a historical record or proof that Android never started the service in previous sessions.
- Payment-source Android notifications remained in the notification tray; no new payment candidates appeared in Aura Review. The tester had adjusted Samsung battery settings and performed an Android access review, without an observed listener connection. The actual installed binary version was not independently read from Android package metadata; the new V2 evidence fields are available in 1.0.26 source.

**Observed:** Android reported grant and enabled component, yet Aura did not observe `onCreate`, `onListenerConnected` or snapshot reads in the captured session; repeated `requestRebind` calls did not show a successful bind.

**Not proven:** why Android did not connect the service (system binding state, OEM policy, process start/crash, component / user-profile state, platform filter or app lifecycle). `ActivityManager.isBackgroundRestricted == false` does not rule out Samsung-specific policies. A successful static `requestRebind` return is only a request, not a binder acknowledgment.

**Triage consequence:** **no parser, deduplication, Room migration, alert-channel or UI Review fix** until the upstream binding stage has been resolved or proven healthy. Existing tray notifications may be replayed only after a successful bound listener snapshot; removed notifications are irrecoverable from `activeNotifications`.

## 2. Owner map (current code)

| Owner / boundary | Files | Relevant contract |
|---|---|---|
| Android grant, V2/legacy component and binding API | `android/app/src/main/java/com/staituned/aura/paymentdetection/listener/NotificationAccessController.kt` | Grant is not binding; avoid `requestUnbind` for an unbound component |
| Android service lifecycle, heartbeat and snapshot replay | `android/app/src/main/java/com/staituned/aura/paymentdetection/listener/AuraNotificationListenerService.kt` | `onCreate` -> `onListenerConnected` -> snapshot -> delivery are distinct stages |
| Process-local endpoint and counters | `android/app/src/main/java/com/staituned/aura/paymentdetection/listener/PaymentDetectionListenerRuntime.kt` | Cannot infer historical service events from resettable counters |
| Recovery coordinator and scheduled work | `android/app/src/main/java/com/staituned/aura/paymentdetection/service/PaymentListenerRecoveryWorker.kt`; `android/app/src/main/java/com/staituned/aura/MainActivity.java` | WorkManager is best effort; don't report a successful bind from a submitted request |
| Native bridge and React user feedback | `android/app/src/main/java/com/staituned/aura/PaymentDetectionPrivacyPlugin.kt`; `src/platform/paymentDetection.ts`; `src/components/payment-detection/PaymentDetectionSettings.tsx` | Status must be fresh and content-free; grant/connected/probe are distinct |
| Deterministic and device tests | `android/app/src/androidTest/java/com/staituned/aura/paymentdetection/listener/PaymentDetectionListenerInstrumentedTest.kt`; `scripts/verify-android-listener-recovery.mjs` | Pixel API36 synthetic tests do not establish Samsung A56 background reliability |

## 3. Delivery workstreams, order and exit criteria

### A — P0: obtain discriminating live Android binding evidence (FIRST, REAL_ENVIRONMENT)

**A1. Read-only, redacted Galaxy A56 check.**
- Confirm installed package/versionCode, Android/One UI release, exact V2 component, framework grant, effective component enabled state and relevant user/profile.
- On the *failed* device session, determine from the system's **live** NotificationManager listener registration/binding records (not historic grants) whether V2 is listed, bound/pending, or refused. Cross-check only the necessary Aura process/service startup and crash/ANR indicators. ADB may help if a computer is available, but is not a prerequisite for deterministic code tests.
- Do **not** commit or paste unfiltered `dumpsys notification`, `logcat` or notification-content screenshots: these can include private notifications and payment data. If tooling is added, make it locally runnable and emit only a strict allowlist of boolean/enumerated component/lifecycle status; do not write raw output to files or CI artifacts. Review command availability and redaction behavior on API36 before using it on personal devices.
- Preserve current app data, notification tray and source opt-in. Do not force repeated revoke/regrant, reinstall, reset, force-stop or artificial purchases to obtain evidence.

**A2. Classify before code changes (one of):**
1. **Grant mismatch or component disabled:** existing triad contradicts an independent OS check → investigate exact component/user/profile/packaging;
2. **Authorized + enabled, but no live binding attempt:** Android scheduler/registration/OEM and component lifecycle investigation; do not blindly churn rebind;
3. **Service created, never connected:** startup, handshake, main-thread issue, exceptions and process/service termination;
4. **Bound + snapshot successful, but no selected notification:** only then test filters, supported packages and account selection;
5. **Candidate created but Review absent:** separate bridge/store consumer path.

**Exit A:** privacy-safe, time-correlated platform evidence plus the classification above linked to #68; owner records what is observed vs hypothesized. If physical access is unavailable, status is **REAL_ENVIRONMENT PENDING** and no root-cause claim is made.

### B — P0: reproducible automated regression and missing-binding contract (PARALLEL WITH A)

**B1.** Add deterministic unit/instrumentation scenarios where `requestRebind` returns normally but `onCreate`/`onListenerConnected` never arrive. Assert a pending/failed binding outcome (not HEALTHY or CONNECTED), no unbind of absent endpoint, bounded retries/no request storm, and no reset of candidate data.

**B2.** Include grant=true + component enabled=true + no endpoint, grant revoked, legacy retirement, recovery worker/settings failure, process restart, callback during teardown, missed callback with still-active notification, snapshot empty vs skipped/failed, and source-selection/privacy guards. Extend only the necessary existing API36 synthetic harness; do not claim emulator can emulate Samsung power management.

**B3.** Make diagnostic sessions distinguishable after process/owner reset and count attempted vs observed bind transitions, without storing notification bodies, package keys, merchant, amount, account identifiers or raw system logs. Durable diagnostics need explicit privacy/security review; prefer minimal in-memory proof where adequate.

**Exit B:** controlled test fails for the documented missing-binding symptom before the eventual fix and passes with verified result-state behavior; tests respect owner and notification access boundaries.

### C — P0: targeted lifecycle/recovery correction (AFTER A classification; B tests as gate)

Change **one canonical owner**, not several competing watchdogs:
- Align `NotificationAccessController`, `PaymentDetectionListenerRuntime`, `BaseAuraNotificationListenerService` and `PaymentListenerRecoveryCoordinator` on explicit states: GRANTED/ELIGIBLE, BIND_REQUESTED (pending), SERVICE_CREATED, CONNECTED, SNAPSHOT_VERIFIED, STALLED/FAILED, REVOKED/DISABLED.
- Distinguish `requestRebind` submission from observed `onCreate`/`onListenerConnected`; use a bounded timeout/transition outcome and prevent concurrent foreground/worker/heartbeat requests from causing churn or unbinding a still-pending endpoint.
- Keep the V2-only post-migration behavior, idempotent legacy retirement, `WorkManager` retries and cancellation at owner/logout/opt-out boundaries. Retry policy must account for Android background scheduling limits and avoid infinite high-frequency requests.
- Preserve opt-in, selected source gating *before notification extras*, confidential local Room candidates, review-before-ledger, no new privileged service, and no persistent financial telemetry.
- Implement only the smallest code change warranted by A. If the OS refuses binding despite correct integration, expose a truthful stalled state and documented user remedy; do not claim an app-only fix can force an OEM binder to start.

**Exit C:** reproduced failure transitions to connected and snapshot-verified under conditions the app can control, or to an explicitly actionable and bounded stalled state under an OS denial; exact regression tests demonstrate this and no safety invariants regress.

### D — P0: validation and physical acceptance (AFTER C, #65)

**Deterministic / REMOTE_AUTOMATED:** because the repo has no `.engineering/commands.json` selector and the agent currently lacks a proven equivalent local Android SDK/Gradle setup, classify lifecycle, Android bridge, WorkManager and shared UI changes as **STRONG** by blast radius. Validate each materially changed exact HEAD/base using existing `.github/workflows/internal-testing-preflight.yml`: Android JVM/lint, API36 instrumentation and listener-recovery verifier, minified release/R8, web regression/E2E. Use **FULL** only if build/toolchain/workflow/global inventory changes make it necessary. Review full diff and base freshness before a code PR/release; rerun invalidated gates after material edits.

**REAL_ENVIRONMENT / separate acceptance:** Play-signed **Internal Testing** update *only after* automated gates and release-owner decision, without uninstall/data wipe. Record on Samsung Galaxy A56 and a representative stock Android 16 device: initial connection; background idle and screen lock (target at least 24h); user return; reboot; grant changes; a controlled supported synthetic source when authorized; and naturally arriving selected-source payment notices without artificial purchases. For notifications left in the tray, verify successful selected-source active snapshot and candidate/Review visibility; never imply removed notifications can be replayed. Record limited redacted stages and actual installed version.

**Exit D:** all required exact-HEAD deterministic checks pass; physical matrix supports reconnect and selected-source candidate creation following prolonged idle/reboot, or shows a transparent diagnosed and accepted platform limitation. No acceptance claim from emulator alone.

### E — Release and closure (AFTER D)

- Verify merge/base and exact product SHA; review complete diff, including generated files. Update runbook, tracker, release notes and #68/#65 with observed evidence and residual risks.
- Require required QA, security/privacy and release decisions. **NO-GO for general promotion** while binding is unexplained or the target physical reliability remains unverified.
- Publish or promote only a specifically qualified build on the approved track. Do not reuse prior 1.0.26 CI as proof of new code.

## 4. Proposed PR sequence / concurrency

| Deliverable | Scope | Depends on | Depth / evidence | Status |
|---|---|---|---|---|
| PR-A | Redacted platform-evidence procedure and/or local-only diagnostic tool | None | LEAN if docs only, SCOPED/STRONG if executable tool with safety/privacy impact | Planned |
| PR-B | Missing-binding regression harness, result-state assertions | None; parallel with physical A | STRONG for Android test/contract additions | Planned |
| PR-C | Single-owner lifecycle/recovery fix, bridge/UI only as needed | A's diagnosis + PR-B failing reproduction | STRONG + exact-head automated preflight | Blocked on A |
| PR-D | Release/QA evidence and runbook after proven build | PR-C and physical acceptance | LEAN docs, separate REAL_ENVIRONMENT proof | Blocked |

An implementation branch must start at fresh `main`, not a detached old diagnostic release branch. If the source or consumer contract changes, inspect and update the related tests before declaring ready for CI.

## 5. Non-goals and safety guardrails

- Do **not** tune payment parser, loosen match confidence, alter candidate fingerprint/Room schema or change ledger semantics to fix zero listener starts; #62 remains independent.
- No automatic system access toggling, Accessibility service, invasive background/foreground workaround, continuous forced rebind loops, uploading raw notification contents, notification keys, personal device identifiers or unredacted system dumps.
- No forced data wipe, reinstall, artificial payment, false 100%-capture promise or production rollout for diagnostic visibility alone.
- Avoid asking the tester to run Gradle or automated deterministic test gates because the agent lacks tooling. Use repository CI for automatable validation.

## 6. Definition of done / current status

- [ ] A: reproducible and redacted, time-correlated A56 framework binding/lifecycle evidence identifies the earliest failing stage.
- [ ] B: missing-binding regression reproduces an accepted bind request with zero observed service starts and bounded retry behavior.
- [ ] C: owning corrective implementation and all direct consumers/tests updated, with safe lifecycle and privacy behavior.
- [ ] D: selected STRONG automated gates green on exact implementation HEAD, plus explicit physical-device reliability evidence.
- [ ] E: runbook, release documentation, #68 and #65 updated; release decision recorded.

**As of 2026-11-21: planning only.** The user-device symptom is reproduced in private diagnostic screenshots; **root cause, corrective product code, new automated preflight and physical acceptance are outstanding**.
