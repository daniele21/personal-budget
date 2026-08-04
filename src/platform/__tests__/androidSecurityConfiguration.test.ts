import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function readProjectTree(path: string): string {
  const root = resolve(process.cwd(), path);
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:java|kt)$/.test(entry.name))
    .map((entry) => readFileSync(resolve(entry.parentPath, entry.name), 'utf8'))
    .join('\n');
}

describe('Android security configuration', () => {
  it('keeps the bundled runtime behind a restrictive CSP', () => {
    const html = readProjectFile('index.html');
    const hosting = JSON.parse(readProjectFile('firebase.json')) as {
      hosting: {
        headers: Array<{
          headers: Array<{ key: string; value: string }>;
        }>;
      };
    };
    const csp = hosting.hosting.headers[0].headers.find(
      ({ key }) => key === 'Content-Security-Policy',
    )?.value;

    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('disables backup, cleartext traffic, and remote Capacitor runtime URLs', () => {
    const manifest = readProjectFile('android/app/src/main/AndroidManifest.xml');
    const legacyBackupRules = readProjectFile(
      'android/app/src/main/res/xml/backup_rules.xml',
    );
    const extractionRules = readProjectFile(
      'android/app/src/main/res/xml/data_extraction_rules.xml',
    );
    const networkPolicy = readProjectFile(
      'android/app/src/main/res/xml/network_security_config.xml',
    );
    const capacitorConfig = readProjectFile('capacitor.config.ts');

    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
    expect(manifest).toContain('android:fullBackupContent="@xml/backup_rules"');
    for (const domain of ['root', 'file', 'database', 'sharedpref', 'external']) {
      expect(legacyBackupRules).toContain(
        `<exclude domain="${domain}" path="." />`,
      );
      expect(extractionRules.match(
        new RegExp(`<exclude domain="${domain}" path="\\." />`, 'g'),
      )).toHaveLength(2);
    }
    expect(manifest).toContain('android:usesCleartextTraffic="false"');
    expect(networkPolicy).toContain('cleartextTrafficPermitted="false"');
    expect(capacitorConfig).not.toMatch(/\burl\s*:/);
  });

  it('enables release shrinking and strips Android log calls', () => {
    const build = readProjectFile('android/app/build.gradle');
    const rules = readProjectFile('android/app/proguard-rules.pro');

    expect(build).toContain("apply plugin: 'com.google.gms.google-services'");
    expect(build).not.toContain("file('google-services.json')");
    expect(build).toContain('minifyEnabled true');
    expect(build).toContain('shrinkResources true');
    expect(rules).toContain('-assumenosideeffects class android.util.Log');
  });

  it('keeps the M7 candidate bridge minimized and has no crash-reporting SDK', () => {
    const plugin = readProjectFile(
      'android/app/src/main/java/com/staituned/aura/PaymentDetectionPrivacyPlugin.kt',
    );
    const mapper = readProjectFile(
      'android/app/src/main/java/com/staituned/aura/paymentdetection/bridge/PaymentDetectionBridgeContract.kt',
    );
    const packageManifest = JSON.parse(readProjectFile('package.json')) as {
      dependencies?: Record<string, string>;
    };
    const dependencies = Object.keys(packageManifest.dependencies ?? {});

    expect(plugin).toContain('fun registerOwner');
    expect(plugin).toContain('fun purgeForLogoutOrReset');
    expect(plugin).toContain('fun listCandidates');
    expect(plugin).toContain('fun beginAcceptance');
    expect(mapper).not.toMatch(
      /put\("(?:title|text|bigText|matchedRuleId|ruleVersion|technicalFingerprint|semanticFingerprint)"/,
    );
    expect(dependencies).not.toContain('@sentry/react');
    expect(dependencies).not.toContain('@sentry/capacitor');
    expect(dependencies).not.toContain('@react-native-firebase/crashlytics');
  });

  it('keeps the native detection path free of network, analytics, and content logs', () => {
    const detectionSources = [
      readProjectTree(
        'android/app/src/main/java/com/staituned/aura/paymentdetection',
      ),
      readProjectFile(
        'android/app/src/main/java/com/staituned/aura/PaymentDetectionPrivacyPlugin.kt',
      ),
    ].join('\n');

    expect(detectionSources).not.toMatch(
      /\b(?:java\.net|HttpURLConnection|okhttp|retrofit|Firebase|Gemini|Analytics)\b/,
    );
    expect(detectionSources).not.toMatch(/\bLog\.(?:v|d|i|w|e|wtf)\s*\(/);
  });

  it('keeps M7 notification actions internal, immutable, and redacted', () => {
    const manifest = readProjectFile('android/app/src/main/AndroidManifest.xml');
    const notifier = readProjectFile(
      'android/app/src/main/java/com/staituned/aura/paymentdetection/notification/PaymentCandidateNotifier.kt',
    );

    expect(manifest).toMatch(
      /<receiver[\s\S]*PaymentCandidateActionReceiver[\s\S]*android:exported="false"\s*\/>/,
    );
    expect(notifier).toContain('PendingIntent.FLAG_IMMUTABLE');
    expect(notifier).toContain('setPublicVersion(publicVersion)');
    expect(notifier).toContain('VISIBILITY_PRIVATE');
    expect(notifier).not.toMatch(/\b(amountMinorUnits|merchant|sourceAppId)\b/);
  });

  it('keeps the M4 listener system-bound and package visibility finite', () => {
    const manifest = readProjectFile('android/app/src/main/AndroidManifest.xml');
    const catalog = readProjectFile(
      'android/app/src/main/java/com/staituned/aura/paymentdetection/data/SupportedPaymentAppCatalog.kt',
    );
    const listener = readProjectFile(
      'android/app/src/main/java/com/staituned/aura/paymentdetection/listener/AuraNotificationListenerService.kt',
    );

    expect(manifest).toContain(
      'android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"',
    );
    expect(manifest).toContain(
      'android:name=".paymentdetection.listener.AuraNotificationListenerService"',
    );
    expect(manifest).not.toContain('QUERY_ALL_PACKAGES');
    expect(manifest).not.toContain('android.permission.READ_SMS');
    expect(manifest).not.toContain('android.permission.BIND_ACCESSIBILITY_SERVICE');
    expect(catalog).toContain('com.staituned.aura.syntheticnotifications');
    expect(catalog).toContain('com.latuabancaperandroid');
    expect(catalog).toContain('com.google.android.apps.walletnfcrel');
    expect(catalog).toContain('com.paypal.android.p2pmobile');
    expect(catalog.match(/packageName = "/g)).toHaveLength(4);
    expect(listener.indexOf('notification.packageName')).toBeLessThan(
      listener.indexOf('notification.notification'),
    );
  });

  it('keeps Wallet simulation emulator-only and self-cleaning', () => {
    const packageManifest = JSON.parse(readProjectFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const simulation = readProjectFile(
      'scripts/simulate-wallet-notification.mjs',
    );
    const testSourceBuild = readProjectFile(
      'android/notification-test-source/build.gradle',
    );

    expect(
      packageManifest.scripts['android:simulate:wallet-notification'],
    ).toContain('simulate-wallet-notification.mjs');
    expect(simulation).toContain("getprop', 'ro.kernel.qemu");
    expect(simulation).toContain('ANDROID_SERIAL');
    expect(simulation).toContain('disallow_listener');
    expect(simulation).toContain("uninstall', sourcePackage");
    expect(simulation).toContain('finally');
    expect(testSourceBuild).toContain('variantBuilder.buildType != "debug"');
  });

  it('keeps listener recovery verification emulator-only and redacted', () => {
    const packageManifest = JSON.parse(readProjectFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const verification = readProjectFile(
      'scripts/verify-android-listener-recovery.mjs',
    );
    const harness = readProjectFile(
      'android/app/src/debug/java/com/staituned/aura/SyntheticPaymentDetectionSetupActivity.kt',
    );

    expect(packageManifest.scripts['android:verify:listener-recovery']).toContain(
      'verify-android-listener-recovery.mjs',
    );
    expect(verification).toContain('ANDROID_SERIAL');
    expect(verification).toContain("getprop', 'ro.kernel.qemu");
    expect(verification).toContain("getprop', 'ro.build.version.sdk");
    expect(verification).toContain("runAdb(['reboot']");
    expect(verification).toContain('disallow_listener');
    expect(verification).toContain('finally');
    expect(harness).toContain('MODE_PROBE');
    expect(harness).not.toContain('rawNotification');
  });
});
