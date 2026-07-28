import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('TypeScript/Kotlin payment detection contract', () => {
  it('keeps method and minimized DTO field names aligned', () => {
    const plugin = readProjectFile(
      'android/app/src/main/java/com/staituned/aura/PaymentDetectionPrivacyPlugin.kt',
    );
    const mapper = readProjectFile(
      'android/app/src/main/java/com/staituned/aura/paymentdetection/bridge/PaymentDetectionBridgeContract.kt',
    );
    const typescript = readProjectFile('src/platform/paymentDetection.ts');

    for (const method of [
      'isSupported',
      'getNotificationAccessStatus',
      'getSettings',
      'listSupportedApps',
      'listCandidates',
      'getCandidate',
      'ignoreCandidate',
      'beginAcceptance',
      'completeAcceptance',
      'recoverAcceptance',
      'deleteAllCandidates',
    ]) {
      expect(plugin).toContain(`fun ${method}`);
      expect(typescript).toContain(`${method}(`);
    }
    for (const field of [
      'amountMinorUnits',
      'currency',
      'merchant',
      'occurredAtEpochMillis',
      'detectedAtEpochMillis',
      'sourceApp',
      'expiresAtEpochMillis',
    ]) {
      expect(mapper).toContain(`"${field}"`);
      expect(typescript).toContain(field);
    }
    expect(mapper).not.toMatch(
      /put\("(?:title|text|bigText|matchedRuleId|ruleVersion|technicalFingerprint|semanticFingerprint)"/,
    );
  });
});
