# Android Payment Detection Runbook

## Release State

The synthetic M3-M8 path is implemented and M9 automated QA is in progress.
General release and real payment-notification processing remain blocked.

Release blockers:

- physical Google Sign-In verification on a Play-signed production build;
- Play App Signing, upload-key custody and Play Console ownership;
- production dependency audit;
- physical stock Android and OEM device matrix;
- privacy-owner lawful-basis, role-allocation and DPIA decisions;
- security, accessibility, Data Safety and Play review approval.

No real notification source or fixture may be enabled while B-002, B-003 or
B-006 in the Android progress tracker is open.

## Build Boundaries

Debug uses `com.staituned.aura.debug`, the non-production Google Services
configuration and normal debug signing. Release uses
`com.staituned.aura`; debug credentials and signing are never valid for it.

Google Services configuration is selected by Gradle build type and remains
untracked:

- `android/app/src/debug/google-services.json` must contain the
  `com.staituned.aura.debug` client;
- `android/app/src/release/google-services.json` must contain the
  `com.staituned.aura` client.

Each variant configuration must also contain its Web OAuth client. Gradle turns
that client into the native `default_web_client_id` resource used by Android
Credential Manager; the JavaScript bundle does not duplicate this identifier.

Never copy or rename one environment over the other before a build.

Before a release build:

1. Place the untracked production configuration at
   `android/app/src/release/google-services.json`; keep the independent debug
   configuration at `android/app/src/debug/google-services.json`.
2. Configure the production OAuth client for the production package and
   app-signing certificate.
3. Supply all upload-key values through the release environment:
   `AURA_ANDROID_UPLOAD_STORE_FILE`,
   `AURA_ANDROID_UPLOAD_STORE_PASSWORD`,
   `AURA_ANDROID_UPLOAD_KEY_ALIAS`, and
   `AURA_ANDROID_UPLOAD_KEY_PASSWORD`.
4. Run `npm run android:sync` to rebuild and copy the production web bundle.
   Never run `android:sync:debug` between this step and the release build.
5. Run `npm run android:verify:release-readiness`. The verifier rejects missing
   assets, production-project omissions and stale debug Firebase markers.
6. Run `npm run test:regression`, `npm run test:e2e`,
   `npm run android:test`, `npm run android:test:instrumentation`, and
   `npm run android:lint`.
7. Run `bash scripts/run-android-gradle.sh :app:bundleRelease`.

On macOS, the repository helper can keep the upload-keystore password in the
user's default Keychain instead of requiring repeated shell exports. The
current PKCS12 upload keystore uses the same password for the store and its key.
Configure it once with:

```bash
npm run android:signing:setup
```

Keychain prompts for the password directly, so it is not printed or added to
shell history. Subsequent production builds can run the sync, readiness gate
and signed bundle task with:

```bash
npm run android:bundle:release
```

The helper defaults to `~/.keystore/aura-upload.jks` and alias `aura-upload`.
Only the non-secret path and alias may be overridden through
`AURA_ANDROID_UPLOAD_STORE_FILE` and `AURA_ANDROID_UPLOAD_KEY_ALIAS`. Never put
passwords in `.env`, Gradle properties, repository files or command arguments.

The verifier reports only bounded configuration codes. It never prints
credential values. Gradle rejects every release task when any upload-key
variable is absent or the bundled WebView assets reference the debug Firebase
project. Signing material must remain outside the repository and
must follow the Play App Signing custody decision in ADR 0002.

## Synthetic Verification

Use only the repository-controlled source on the Pixel 9 Pro API 36 AVD:

```text
npm run android:simulate:wallet-notification
npm run android:simulate:wallet-notification:cleanup
npm run android:verify:listener-recovery
```

Expected path:

1. the selected synthetic package posts a bounded fixture;
2. Aura gates the package before reading extras;
3. a structured encrypted candidate is stored locally;
4. the redacted Aura notification opens the review queue;
5. confirmation writes one canonical transaction and removes candidate
   payload;
6. ignore removes payload and retains only the bounded tombstone.

Never paste notification payloads, Firebase tokens, user identifiers,
candidate fields or financial values into tickets or logs.

## Diagnostics

Safe evidence includes:

- app package and build variant;
- AVD/device model, API and build number;
- rule version, result tier and bounded counters;
- candidate workflow state without candidate content;
- release-verifier finding codes;
- test name and pass/fail state.

If detection is unavailable:

Aura treats Android notification-access permission, the effective listener
connection, listener-component generation, and Aura's payment-alert channel as
separate states. The recovery worker no longer trusts `listenerConnected=true`
by itself: every pass probes the live listener and reconciles a bounded active
snapshot. If the probe is absent or fails, Aura cycles the effective component
with Android's unbind/rebind APIs.

If the UI shows **Access upgrade needed**, the install still has only the
original listener component grant. Use **Upgrade Android access** and enable
**Aura payment detection** (not the entry marked legacy) in Android settings.
This is a one-time migration to a new component identity with fresh
all-notification filter defaults. Once V2 has been granted, revoking it stops
Aura rather than silently falling back to the old component.

If the UI shows **Active** but a real payment is missed, use **Repair listener**.
That forces a V2 binding cycle even though Android still reports the grant.
Aura also performs a best-effort one-minute health heartbeat while the bound
listener process is alive, plus foreground and WorkManager probes, so active
selected notifications can be reconciled without waiting for a disconnect
callback. A confirmed missed callback triggers a fresh binding automatically.

The reconciliation window is capped to 14 days and 128 of the newest selected
notifications. Package and user-selection checks run before title/text/bigText
are read and before the 128-item cap. Existing technical fingerprints suppress
replay duplicates.

1. confirm the user is authenticated;
2. inspect whether the state is **Access upgrade needed**, **Reconnecting**,
   **Active**, or **Alerts blocked**;
3. complete the one-time V2 access upgrade if requested;
4. if the listener is reconnecting or appears stale while still Active, use
   **Repair listener**;
5. confirm the supported payment app is selected;
6. confirm **Aura payment alerts** is enabled; if blocked, open the dedicated
   Android channel settings from Aura;
7. run the synthetic source;
8. verify both failure modes on the test AVD: disconnected blackout recovery and
   connected-listener missed-callback recovery;
9. run listener recovery only on the test AVD.

Do not enable WebView debugging or dynamic native content logs in a release
artifact. Do not export the candidate database.

## Incident Response

For suspected package-gate, cross-account, backup, log or network leakage:

1. stop the pilot and do not add new sources;
2. instruct affected testers to pause detection and revoke notification
   access;
3. preserve only redacted technical evidence;
4. classify whether confirmed ledger transactions are affected;
5. purge pending native data through the existing local-reset or
   account-boundary path;
6. require privacy and security owner review before re-enabling.

Pending candidates are disposable workflow data. Confirmed transactions are
canonical user data and must not be silently deleted.

## Rollback

Operational rollback, in increasing scope:

1. pause detection in Aura;
2. deselect every supported source;
3. revoke Aura notification access in Android settings;
4. halt the Play rollout or restore the previous signed bundle;
5. ship a release that keeps detection disabled while preserving the PWA and
   existing ledger.

Rollback must not convert candidates automatically or delete confirmed
transactions. A schema rollback is not permitted unless Room migration and
data-deletion behavior have separate tested instructions.

## Post-Release Watch

During any approved pilot, watch only aggregate, non-content signals:

- listener enabled/disabled and recovery reports;
- exact/review/ignored/accepted counts supplied manually by testers;
- duplicate prevention outcomes;
- crash/ANR reports verified to contain no financial payload;
- battery/process-management reports by device model;
- user reports of missed or false detections.

There is no remote rule update, analytics path or detection telemetry in the
approved architecture.
