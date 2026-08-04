# ADR 0002: Aura Android Capacitor Runtime

- Status: Accepted
- Date: 2026-07-25
- Owners: Aura Finance maintainers
- Delivery tracker: [`docs/00-discovery/11-android-payment-detection-progress-plan.md`](../docs/00-discovery/11-android-payment-detection-progress-plan.md)
- Related: [`ADR 0003`](./0003-aura-payment-candidate-acceptance.md), [`ADR 0004`](./0004-aura-payment-detection-beta-only-release.md)

## Context

Aura is a local-first React/Vite PWA. Its financial domain, reports, persistence, optional encrypted cloud backup, portable archive, authentication, and accessibility behavior already live in the web application.

The planned payment-detection feature must receive Android notification callbacks while the React WebView is closed. A PWA cannot read notifications posted by other Android apps, so the feature requires native Android code.

The product must choose whether to replace the PWA, create a separate native application, or introduce a narrow native runtime around the existing web product.

## Decision

### Product Distribution

Aura will maintain two supported distributions from one repository:

```text
React/Vite build
├── hosted web build → PWA
└── bundled web build → Android Capacitor app
```

The Android app does not replace or deprecate the PWA. Browser, desktop, and non-Android users retain the PWA. Android-only features are exposed through typed platform capabilities and are not required for web startup.

### Native Runtime

Aura will use Capacitor 8 and commit the generated `android/` project.

Platform baseline for the first release:

- application ID: `com.staituned.aura`;
- `minSdk`: 36;
- `compileSdk`: 36;
- `targetSdk`: 36;
- Node.js: 22 or newer;
- Android SDK platform/build tools: API 36;
- Android Studio: optional for the CLI workflow; when used, 2025.2.1 or newer;
- Java/JDK: 21 for the committed Gradle toolchain.

Build/environment separation:

- release application ID: `com.staituned.aura`;
- debug application ID: `com.staituned.aura.debug` through `applicationIdSuffix`;
- distinct app label and launcher treatment for debug builds;
- separate non-production and production Firebase projects/configuration;
- separate OAuth clients for each package/signing-certificate combination;
- debug signing is never accepted for production;
- production environment files, OAuth credentials and signing material are not committed.

Development and E2E builds must not read or write production Firebase user data. Any temporary exception requires an explicit release/security decision and is not the default architecture.

Before the first signed or Play-distributed artifact, the release owner must verify:

- control of the `staituned.com` namespace;
- package availability in Play Console;
- developer identity verification;
- signing and upload-key ownership.

Play App Signing will manage the app-signing key. Aura will use a separate upload key with restricted maintainer access, encrypted backup outside the repository, documented rotation/recovery ownership, and no signing secret committed to source control. Play Console and key custody remain an operational gate before the first internal signed distribution.

If package availability fails before publication, the maintainers must amend this ADR and regenerate the unpublished Android project. The package must not change after publication.

### Production Asset Model

Production Android builds package the reviewed Vite output inside the application.

- Production must not use a remote Capacitor `server.url`.
- Live reload may be used only in explicit local debug configuration.
- Navigation to unapproved remote origins must be blocked or handed to the system browser.
- Native bridge APIs are available only to the bundled application origin.

This keeps native capability and reviewed JavaScript release state aligned.

### Platform Boundaries

React will depend on typed abstractions for:

- platform capability detection;
- authentication;
- notification delivery;
- payment detection;
- deep links and app lifecycle;
- PWA install behavior.

The web implementation reports payment detection as unsupported. It must not import or require Android classes, plugin initialization, or a global Capacitor object to render.

The Android implementation:

- hides PWA install actions;
- does not rely on the service worker for native payment suggestions;
- retains existing browser notification behavior only through an explicit platform adapter;
- refreshes native candidate state on cold start and resume.

### Authentication

The current browser `signInWithPopup` flow is not treated as the Android contract.

Android authentication uses the system Credential Manager through Aura's
first-party Kotlin Capacitor plugin:

```text
Credential Manager
→ Google ID token in memory
→ Capacitor auth bridge
→ Firebase JS signInWithCredential
→ existing Firebase UID and allowlist behavior
```

Constraints:

- no third-party auth plugin without dependency and privacy review;
- no token persistence or logging in native code;
- Credential Manager reads its Web client ID from the Android resource
  generated by `google-services.json`; the client ID is not passed through the
  Capacitor bridge;
- debuggable builds may emit structured local diagnostics containing only the
  auth stage, bounded error code, exception class and sanitized stack frames;
  exception messages, tokens, OAuth client IDs, emails, credential payloads
  and Firebase profiles are excluded;
- release builds emit no native auth diagnostics and keep Capacitor logging
  disabled;
- Android debug builds require dedicated `VITE_ANDROID_FIREBASE_*` values and
  fail before bundling if they are absent;
- logout clears Firebase state and calls the native detection purge/suspend operation;
- account changes cannot reuse candidates belonging to a previous UID.

### Native Feature Placement

The first Android-only plugin is payment detection.

Native Kotlin owns:

- notification listener callbacks;
- package selection settings;
- rule evaluation;
- Room candidate persistence;
- retention and dedupe;
- Android notifications and deep-link intents.

React owns:

- disclosure and setup UX;
- candidate review;
- transaction validation;
- canonical transaction creation;
- user-facing data reset orchestration.

Native code never writes Aura financial `AppData` or WebView localStorage.

The `NotificationListenerService` is the only component intentionally bindable by the Android system. It is declared with `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`, exposes no custom application intent API, and performs the package allow check before accessing extras. Plugin helpers, receivers, activities, and services remain non-exported unless a documented Android requirement says otherwise.

### Storage And Backup

Aura already provides an encrypted optional backup and a portable archive. Native Android backup must not create a parallel implicit transport for financial or detection data.

The Android release will:

- set an explicit backup policy;
- disable Android cloud backup for Aura-managed data;
- exclude app root, databases, files, SharedPreferences, and device-protected equivalents from cloud backup and device-to-device transfer through applicable extraction rules;
- test the effective behavior on supported Android versions and at least one OEM device.

If an OEM cannot honor the intended exclusion, production release is blocked until the residual risk is accepted by the privacy and security owners.

### Release Model

Release progression:

```text
local debug
→ Play internal testing
→ closed beta
→ staged production opt-in
```

Native code or bundled web changes require an Android release. The hosted PWA may continue its normal web deployment cadence, but shared-domain changes must remain compatible with the latest supported Android bundle.

The initial compatibility matrix is:

- Pixel emulator on Android 16/API 36 for the supported runtime;
- at least one Pixel-class physical device on Android 16 and one Samsung device on Android 16 before the real-user pilot;
- no compatibility claim for Android versions earlier than Android 16.

## Consequences

### Positive

- Existing React product and financial domain are reused.
- PWA users retain browser and desktop access.
- Native background work is isolated to the capability that requires it.
- Kotlin can process notifications when the WebView is closed.
- Platform-specific behavior becomes explicit and testable.
- No remote runtime code is required.

### Negative

- Aura gains Android Studio, Gradle, Kotlin, signing, Play Console, and device-QA responsibilities.
- Web and Android releases can temporarily run different bundled React versions.
- Authentication, service worker, notification, deep-link, and lifecycle behavior require adapters.
- The generated Android project becomes maintained source, not disposable output.
- Bank notification templates create ongoing maintenance work.
- Requiring Android 16 deliberately narrows device reach in exchange for one
  tested runtime baseline; expanding support later requires an explicit
  compatibility decision and device matrix.

## Alternatives Rejected

### Deprecate The PWA

Rejected because it removes universal browser access and provides no technical benefit to the notification listener.

### Full Kotlin Application

Rejected because it duplicates the UI, financial domain, reports, storage, archive, cloud backup, and accessibility implementation.

### React Native Rewrite

Rejected for the MVP because it creates a second application architecture and migration program for a feature that requires only a narrow native boundary.

### Remote-Hosted WebView

Rejected for production because it weakens release integrity, offline behavior, bridge isolation, and Play-review traceability.

### PWA-Only Workaround

Rejected because browser APIs cannot observe notifications from other Android applications.

## Verification

M1-M2 must demonstrate:

- PWA startup without Capacitor;
- Android startup from bundled assets;
- localStorage and IndexedDB survival across restart;
- Firebase login/logout and account switch;
- archive export/import and cloud-backup compatibility;
- service-worker/PWA-install suppression in Android;
- blocked remote navigation;
- reproducible web and Android builds;
- no signing material or credential in source control.

This ADR does not authorize reading real financial notifications. That remains gated by M3 privacy/security readiness and the feature specification.
