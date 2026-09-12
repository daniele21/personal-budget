import { describe, expect, it } from 'vitest';
import {
  ANDROID_DEBUG_MODE,
  addAndroidCiFirebaseCspOrigins,
  createAndroidDebugEnvOverrides,
  isAndroidCiFirebaseEmulatorBuild,
} from '../../../vite.android-runtime';

const isolatedEnvironment = {
  VITE_ANDROID_FIREBASE_API_KEY: 'debug-api-key',
  VITE_ANDROID_FIREBASE_AUTH_DOMAIN: 'debug.example.invalid',
  VITE_ANDROID_FIREBASE_PROJECT_ID: 'aura-debug',
  VITE_ANDROID_FIREBASE_STORAGE_BUCKET: 'aura-debug.invalid',
  VITE_ANDROID_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_ANDROID_FIREBASE_APP_ID: 'debug-app-id',
  VITE_ANDROID_FIRESTORE_DATABASE_ID: 'debug-db',
};

describe('createAndroidDebugEnvOverrides', () => {
  it('does not alter normal web builds', () => {
    expect(createAndroidDebugEnvOverrides('production', {
      AURA_ANDROID_CI_FIREBASE_EMULATORS: 'true',
      AURA_ANDROID_CI_AUTH_EMAIL: 'android-e2e@aura.invalid',
      AURA_ANDROID_CI_AUTH_PASSWORD: 'synthetic-password',
    })).toEqual({});
  });

  it('refuses an Android debug build without isolated credentials', () => {
    expect(() => createAndroidDebugEnvOverrides(ANDROID_DEBUG_MODE, {}))
      .toThrow(/isolated non-production/i);
  });

  it('maps only Android-specific Firebase values', () => {
    const overrides = createAndroidDebugEnvOverrides(
      ANDROID_DEBUG_MODE,
      isolatedEnvironment,
    );

    expect(overrides).toMatchObject({ VITE_FIREBASE_PROJECT_ID: 'aura-debug' });
    expect(overrides).not.toHaveProperty('VITE_AURA_ANDROID_CI_FIREBASE_EMULATORS');
    expect(Object.keys(overrides)).not.toContain('VITE_GEMINI_API_KEY');
  });

  it('uses a demo Firebase project only for the explicit Android CI emulator lane', () => {
    const overrides = createAndroidDebugEnvOverrides(
      ANDROID_DEBUG_MODE,
      {
        ...isolatedEnvironment,
        AURA_ANDROID_CI_FIREBASE_EMULATORS: 'true',
        AURA_ANDROID_CI_AUTH_EMAIL: 'android-e2e@aura.invalid',
        AURA_ANDROID_CI_AUTH_PASSWORD: 'synthetic-password',
      },
    );

    expect(overrides).toMatchObject({
      VITE_FIREBASE_API_KEY: 'fake-api-key',
      VITE_FIREBASE_PROJECT_ID: 'demo-aura-android-ci',
      VITE_FIRESTORE_DATABASE_ID: 'budget-db',
      VITE_AURA_ANDROID_CI_FIREBASE_EMULATORS: 'true',
      VITE_AURA_ANDROID_CI_AUTH_EMAIL: 'android-e2e@aura.invalid',
      VITE_AURA_ANDROID_CI_AUTH_PASSWORD: 'synthetic-password',
    });
    expect(overrides.VITE_FIREBASE_PROJECT_ID)
      .not.toBe(isolatedEnvironment.VITE_ANDROID_FIREBASE_PROJECT_ID);
  });

  it('fails closed when the CI emulator lane lacks its synthetic auth identity', () => {
    expect(() => createAndroidDebugEnvOverrides(
      ANDROID_DEBUG_MODE,
      {
        ...isolatedEnvironment,
        AURA_ANDROID_CI_FIREBASE_EMULATORS: 'true',
      },
    )).toThrow(/synthetic auth identity/i);
  });
});

describe('Android CI Firebase browser boundary', () => {
  it('enables emulator behavior only for the explicit Android debug lane', () => {
    const environment = { AURA_ANDROID_CI_FIREBASE_EMULATORS: 'true' };

    expect(isAndroidCiFirebaseEmulatorBuild('production', environment)).toBe(false);
    expect(isAndroidCiFirebaseEmulatorBuild(ANDROID_DEBUG_MODE, environment)).toBe(true);
  });

  it('adds only the Android emulator Auth and Firestore origins to connect-src', () => {
    const html = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; connect-src \'self\' https://example.invalid;">';
    const transformed = addAndroidCiFirebaseCspOrigins(html);

    expect(transformed).toContain(
      "connect-src 'self' http://10.0.2.2:9099 http://10.0.2.2:8080 https://example.invalid",
    );
    expect(transformed.match(/http:\/\/10\.0\.2\.2:/g)).toHaveLength(2);
  });

  it('fails closed when the expected CSP directive is absent', () => {
    expect(() => addAndroidCiFirebaseCspOrigins('<html></html>'))
      .toThrow(/could not find connect-src/i);
  });
});
