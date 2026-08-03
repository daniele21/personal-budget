import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
  scripts?: Record<string, string>;
}

const manifest = JSON.parse(
  readFileSync('package.json', 'utf8'),
) as PackageManifest;

describe('Android debug command isolation', () => {
  it.each([
    'android:test:instrumentation',
    'android:verify:webview',
    'android:verify:transaction-import-webview',
  ])('%s rebuilds or synchronizes isolated debug web assets first', (scriptName) => {
    const script = manifest.scripts?.[scriptName] ?? '';

    expect(script).toMatch(/^npm run android:(?:sync|assemble):debug && /);
  });
});
