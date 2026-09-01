# Remote Android and Google Play automation

Aura supports remote Android testing and release flows designed to be orchestrated from ChatGPT through the connected GitHub repository. After the one-time GitHub configuration is complete, routine debug verification and Google Play publication do not require a developer workstation, local Android SDK, local Gradle invocation, local upload keystore, or an interactive Play Console browser session.

## ChatGPT-driven debug test protocol

`Repository health` accepts pushes to `debug-test/**`. This gives ChatGPT a repository-owned way to exercise any chosen source SHA without relying on manual `workflow_dispatch` access.

For a request such as `test this Aura version on Android debug`:

1. resolve the exact source SHA to test;
2. create or reset a `debug-test/**` branch to that SHA;
3. commit an ephemeral `android/debug-test-trigger.properties` file on the debug-test branch so the blast-radius selector chooses at least the `strong` profile;
4. follow the exact trigger commit's `Repository health` run;
5. inspect the Android job result and its evidence artifact before reporting success.

The Android preflight performs, from a clean checkout:

- isolated debug Firebase/OAuth/Google Services materialization;
- Android debug web build and Capacitor sync;
- Android unit tests and lint;
- packaged `com.staituned.aura.debug` APK build;
- Android API 36 Google APIs x86_64 emulator boot;
- 34 native instrumentation tests, including the synthetic notification test source;
- installation and launch of the packaged APK;
- real WebView/Capacitor runtime detection;
- localStorage, IndexedDB and attachment persistence across process restart;
- debug deep-link delivery;
- mandatory screenshot and video capture for the instrumentation and WebView journeys;
- logcat, activity/package diagnostics, Android reports and packaged APK retention.

A debug-test branch never publishes to Google Play. Its purpose is executable preflight evidence only.

## Google Play safety model

A release is never published just because a branch exists. Publication requires all of the following on the exact release commit:

1. a release branch named `play-release/internal/<version>` or `play-release/production/<version>`;
2. `android/release-trigger.properties` committed on that branch;
3. the trigger's `source_sha` already belongs to `main`;
4. the release branch differs from `source_sha` only by `android/release-trigger.properties`;
5. a successful `Repository health` run for that exact trigger commit;
6. browser critical journeys passing;
7. Android unit and lint checks passing;
8. API 36 emulator provisioning plus instrumentation/WebView journeys passing;
9. production Firebase/release-readiness validation;
10. successful signed AAB creation and signature verification;
11. successful Google Play Developer API upload.

The release workflow is `.github/workflows/google-play-release.yml`. It is triggered by the successful completion of `Repository health` on a `play-release/**` branch and checks out `github.event.workflow_run.head_sha`, so the bundle is built from the exact validated release commit. The Play workflow itself is loaded from the default branch after this automation has been merged.

## ChatGPT-driven release protocol

For an internal release request such as `publish Aura 1.0.9 to internal testing`:

1. resolve the exact `main` product source SHA to release;
2. create `play-release/internal/1.0.9` from that SHA;
3. commit `android/release-trigger.properties` containing:

   ```properties
   track=internal
   version=1.0.9
   source_sha=<40-character main source SHA>
   ```

4. follow the exact-head `Repository health` run until all required jobs finish;
5. only after that run is green, follow `Google Play release` and inspect its build/publish result;
6. report the source SHA, validated release commit, track, version name, computed version code, workflow run and release artifact identity.

Production uses the same protocol with `play-release/production/<version>` and `track=production`. A production release must only be initiated after an explicit production-publish request.

The trigger file is deliberately under `android/`; therefore the blast-radius selector classifies the trigger commit as at least `strong`, exercising the Android emulator gate before publication.

## Version identity

`android/version.properties` remains the canonical Android application-version source for normal development and checked-in builds. The release branch suffix supplies the requested Play `versionName`, while the workflow derives a monotonically increasing CI `versionCode` as `100000 + Repository health run_number`.

After the exact release commit has already passed `Repository health`, the release runner writes those two resolved values into its ephemeral checkout's `android/version.properties` before the production build. The repository itself is not mutated, and Gradle continues to read version identity from one source only.

The release artifact includes a manifest and SHA-256 checksum tying the AAB to the product source SHA, release trigger commit, health run, track, version name and version code.

## One-time GitHub configuration

The debug flow uses the existing GitHub Environment `android-ci`, which contains the isolated debug Firebase/OAuth configuration and `AURA_ANDROID_CI_GOOGLE_SERVICES_JSON_B64`.

For publication, create a GitHub Environment named `play-console` and configure these environment variables with the production Firebase web configuration:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIRESTORE_DATABASE_ID`

Configure these secrets in `play-console`:

- `AURA_ANDROID_RELEASE_GOOGLE_SERVICES_JSON_B64`: base64 of the production `google-services.json` containing the `com.staituned.aura` Android client and Web OAuth client;
- `AURA_ANDROID_CI_GOOGLE_SERVICES_JSON_B64`: base64 of the debug CI `google-services.json`, reused by release-readiness checks to prove that production WebView assets do not contain the debug Firebase project;
- `AURA_ANDROID_UPLOAD_KEYSTORE_B64`: base64 of the Play upload keystore;
- `AURA_ANDROID_UPLOAD_STORE_PASSWORD`;
- `AURA_ANDROID_UPLOAD_KEY_ALIAS`;
- `AURA_ANDROID_UPLOAD_KEY_PASSWORD`;
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: raw service-account JSON authorized for the Aura application in Google Play Console.

Do not commit any of these values or generated `google-services.json`/keystore material.

## Google Play permissions

The service account used by `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` must be authorized for `com.staituned.aura` with sufficient release permissions for the target tracks. Keep the account scoped to the minimum permissions needed to upload and manage releases.

The workflow pins `r0adkll/upload-google-play` to the exact commit corresponding to v1.1.5 instead of using a floating tag.

## Evidence and retention

Each Android emulator preflight retains for seven days:

- the packaged debug APK;
- Android test/lint reports;
- instrumentation screenshot and video;
- WebView journey screenshot and video;
- emulator/logcat/activity/package diagnostics.

Every release workflow keeps for 30 days:

- the signed `app-release.aab`;
- R8 `mapping.txt`;
- SHA-256 checksum;
- release manifest with source and workflow identity.

## Failure policy

A failure at any gate blocks the corresponding success claim or publication. Do not weaken or skip a failing check to make a test or release proceed. Diagnose the exact failure, fix it on a development branch, obtain fresh exact-head evidence, and create a new debug/release trigger only from the corrected source commit.
