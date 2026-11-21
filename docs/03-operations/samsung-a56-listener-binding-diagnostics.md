# Galaxy A56 — read-only V2 listener binding diagnosis

**Incident:** [#68](https://github.com/daniele21/personal-budget/issues/68)  
**Workstream:** [#77](https://github.com/daniele21/personal-budget/issues/77)  
**Baseline:** Aura 1.0.26 product code; no release modification.

This is an **evidence collection aid**, not a listener repair. Current Samsung Galaxy A56 diagnostics show Android V2 framework approval `Yes`, V2 component enabled `Yes`, generic background restriction `No`, but 25 requested recoveries with zero V2 service starts, connections or active snapshots in the captured process-local diagnostic interval. Root cause remains undetermined.

## Privacy-safe collection when a consenting physical device is connected

The script `scripts/diagnose-android-listener-binding.mjs` is local-only and strictly read-only. On a trusted developer computer with Android platform-tools (ADB) installed, the tester can explicitly authorize USB debugging, then run:

```sh
node scripts/diagnose-android-listener-binding.mjs
```

If multiple devices are connected, set `ANDROID_SERIAL` locally to the intended device before the command. The script checks readiness without printing the serial.

**No one must run ADB, Grant/Unbind, Gradle or release commands on the tester's phone merely to satisfy deterministic automation.** The above is an optional **REAL_ENVIRONMENT** investigation step only. Do not execute an unrestricted `adb shell dumpsys notification`, `logcat` or `dumpsys package` command in a shared terminal, ticket, CI system or chat: these can contain notification bodies and identifiers.

The helper reads system output only in process memory, suppresses command exceptions, prints **whitelisted fields only**, and does not write files, grant/revoke access, restart/kill apps, remove notifications, upload anything or change settings. Only the explicitly filtered JSON can be considered for an issue update; do not attach raw system output.

## Meaning of output

| Field | Meaning | Limitation |
|---|---|---|
| `status` | `READ_ONLY_SNAPSHOT` or a bounded availability code | Not a fix |
| `sdk` | Android API level from `getprop` | Does not identify One UI version |
| `appInstalled`, `versionCode`, `versionName` | Package metadata, where readable | Device can have profiles or OEM variants; independently confirm visible app |
| `secureListV2Granted` | Exact V2 component in Settings.Secure list | **Not** `NotificationManager.isNotificationListenerAccessGranted`; compare with Aura UI's framework approval |
| `liveSectionAvailable` | Recognized platform `Live notification listeners` section | OEM formatting may differ; missing is `unknown` |
| `liveV2Mentioned` | Exact V2 class mentioned in the live-list section | **Not proof** that `onListenerConnected` was delivered |
| `activityServiceV2Mentioned` | Exact V2 class appeared in ActivityManager's service section | **Not proof** the listener completed binding or is healthy |

The helper intentionally does **not** export per-notification contents, merchant, amount, app list, notification key, user ID, device serial, package paths or raw logs. It does not claim to determine the Android/OEM root cause from one snapshot.

## Next evidence steps

1. While the failure is present, record a fresh **in-app** native refresh: V2 framework approval, V2 enabled, generic background restriction, service starts, `onListenerConnected`, snapshot read/fail counters and `lastRecoveryResult` (process scope).
2. If a trusted physical developer computer is available, run the **read-only helper once** and compare its allowed output, timestamp and package version against the in-app counters. Do not regrant/revoke or reinstall just to create a failure.
3. If both Android and Aura say enabled/granted but no live binding is observed, inspect **only locally and with strict privacy constraints** whether NotificationManager is scheduling/refusing the service and whether there are Aura process startup failures; an absent live-list section alone cannot establish an OS denial.
4. Classify the earliest failing stage in #77/#68 before changing `NotificationAccessController` or `PaymentListenerRecoveryCoordinator`. A signed A56 recovery test, not a screenshot alone, remains required under #65.

## Test boundary

Pure redaction/parser tests live in `scripts/__tests__/diagnose-android-listener-binding.test.mjs`, discovered by the existing Vitest regression gate. They use synthetic dumps with fake content to verify that the output contains no notification bodies. Device output and a true OS binder transition require separately approved real-device validation and cannot be simulated by Vitest.
