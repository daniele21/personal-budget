import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
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

    expect(build).toContain('minifyEnabled true');
    expect(build).toContain('shrinkResources true');
    expect(rules).toContain('-assumenosideeffects class android.util.Log');
  });

  it('keeps the M3 bridge metadata-only and has no crash-reporting SDK', () => {
    const plugin = readProjectFile(
      'android/app/src/main/java/com/staituned/aura/PaymentDetectionPrivacyPlugin.kt',
    );
    const packageManifest = JSON.parse(readProjectFile('package.json')) as {
      dependencies?: Record<string, string>;
    };
    const dependencies = Object.keys(packageManifest.dependencies ?? {});

    expect(plugin).toContain('fun registerOwner');
    expect(plugin).toContain('fun purgeForLogoutOrReset');
    expect(plugin).not.toMatch(/\b(title|bigText|merchant|amount|fingerprint)\b/);
    expect(dependencies).not.toContain('@sentry/react');
    expect(dependencies).not.toContain('@sentry/capacitor');
    expect(dependencies).not.toContain('@react-native-firebase/crashlytics');
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
    expect(catalog).not.toMatch(/\b(bank|wallet|paypal|revolut)\b/i);
    expect(listener.indexOf('notification.packageName')).toBeLessThan(
      listener.indexOf('notification.notification'),
    );
  });
});
