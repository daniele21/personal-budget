# Google Play release automation

Aura supports a remote release flow designed to be orchestrated from ChatGPT through the connected GitHub repository. No local Android SDK, Gradle invocation, upload keystore, or Play Console browser session is required after the one-time GitHub configuration is complete.

## Safety model

A release is never published just because a branch exists. Publication requires all of the following on the exact release commit:

1. a release branch named `play-release/internal/<version>` or `play-release/production/<version>`;
2. `android/release-trigger.properties` committed on that branch;
3. a successful `Repository health` run for that trigger commit;
4. browser critical journeys passing;
5. Android unit and lint checks passing;
6. API 36 emulator provisioning plus instrumentation/WebView journeys passing when the selected profile is `strong` or `full`;
7. production Firebase/release-readiness validation;
8. successful signed AAB creation and signature verification;
9. successful Google Play Developer API upload.

The release workflow is `.github/workflows/google-play-release.yml`. It is triggered by the successful completion of `Repository health` on a `play-release/**` branch and checks out `github.event.workflow_run.head_sha`, so the bundle is built from the exact validated commit.

## ChatGPT-driven release protocol

For an internal release request such as `publish Aura 1.0.9 to internal testing`:

1. resolve the exact product source SHA to release;
2. create `play-release/internal/1.0.9` from that SHA;
3. commit `android/release-trigger.properties` containing:

   ```properties
   track=internal
   version=1.0.9
   source_sha=<40-character product source SHA>
   ```

4. follow the exact-head `Repository health` run until all required jobs finish;
5. only after that run is green, follow `Google Play release` and inspect its build/publish result;
6. report the source SHA, validated release commit, track, version name, computed version code, workflow run, and release artifact identity.

Production uses the same protocol with `play-release/production/<version>` and `track=production`. A production release must only be initiated after an explicit production-publish request.

The trigger file is deliberately under `android/`; therefore the blast-radius selector classifies the trigger commit as at least `strong`, exercising the Android emulator gate before publication.

## Version identity

The branch suffix is the Android `versionName` for the release build. The workflow derives a monotonically increasing CI `versionCode` as `100000 + Repository health run_number`, keeping CI release identity outside source mutation while preserving the checked-in default version for normal development builds.

`android/app/build.gradle` accepts these CI-only overrides through:

- `AURA_ANDROID_VERSION_NAME`
- `AURA_ANDROID_VERSION_CODE`

The release artifact includes a manifest and SHA-256 checksum tying the AAB to the product source SHA, release trigger commit, health run, track, version name, and version code.

## One-time GitHub configuration

Create a GitHub Environment named `play-console` and configure these environment variables with the production Firebase web configuration:

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

## Release artifacts

Every release workflow keeps for 30 days:

- the signed `app-release.aab`;
- R8 `mapping.txt`;
- SHA-256 checksum;
- release manifest with source and workflow identity.

Debug emulator evidence remains in the `Repository health` run and includes the packaged debug APK plus screenshots, video, diagnostics, and Android reports when those journeys execute.

## Failure policy

A failure at any gate blocks publication. Do not weaken or skip a failing check to make a release proceed. Diagnose the exact failure, fix it on a development branch, obtain fresh exact-head evidence, and create a new release trigger only from the corrected source commit.
