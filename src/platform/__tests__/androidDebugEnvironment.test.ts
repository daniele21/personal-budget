import { describe, expect, it } from 'vitest';
import {
  ANDROID_DEBUG_MODE,
  createAndroidDebugEnvOverrides,
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
    expect(createAndroidDebugEnvOverrides('production', {})).toEqual({});
  });

  it('refuses an Android debug build without isolated credentials', () => {
    expect(() => createAndroidDebugEnvOverrides(ANDROID_DEBUG_MODE, {}))
      .toThrow(/isolated non-production/i);
  });

  it('maps only Android-specific Firebase values and disables Gemini', () => {
    const overrides = createAndroidDebugEnvOverrides(
      ANDROID_DEBUG_MODE,
      isolatedEnvironment,
    );

    expect(overrides).toMatchObject({
      VITE_FIREBASE_PROJECT_ID: 'aura-debug',
      VITE_GEMINI_API_KEY: '',
    });
  });
});
