export const ANDROID_DEBUG_MODE = 'android-debug';

const REQUIRED_ANDROID_DEBUG_ENV_KEYS = [
  'VITE_ANDROID_FIREBASE_API_KEY',
  'VITE_ANDROID_FIREBASE_AUTH_DOMAIN',
  'VITE_ANDROID_FIREBASE_PROJECT_ID',
  'VITE_ANDROID_FIREBASE_STORAGE_BUCKET',
  'VITE_ANDROID_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_ANDROID_FIREBASE_APP_ID',
] as const;

const ANDROID_CI_FIREBASE_PROJECT_ID = 'demo-aura-android-ci';
const ANDROID_CI_FIRESTORE_DATABASE_ID = 'budget-db';
const ANDROID_CI_FIREBASE_API_KEY = 'fake-api-key';
const ANDROID_CI_FIREBASE_APP_ID = '1:000000000000:web:aura-android-ci';
const ANDROID_CI_FIREBASE_MESSAGING_SENDER_ID = '000000000000';

export type AndroidDebugEnvironment = Record<
  (typeof REQUIRED_ANDROID_DEBUG_ENV_KEYS)[number],
  string
> & {
  VITE_ANDROID_FIRESTORE_DATABASE_ID?: string;
  AURA_ANDROID_CI_FIREBASE_EMULATORS?: string;
  AURA_ANDROID_CI_AUTH_EMAIL?: string;
  AURA_ANDROID_CI_AUTH_PASSWORD?: string;
};

export function createAndroidDebugEnvOverrides(
  mode: string,
  environment: Record<string, string>,
): Record<string, string> {
  if (mode !== ANDROID_DEBUG_MODE) return {};

  const missing = REQUIRED_ANDROID_DEBUG_ENV_KEYS.filter(
    (key) => !environment[key]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `Android debug requires an isolated non-production Firebase/OAuth configuration. Missing: ${missing.join(', ')}`,
    );
  }

  const value = (key: keyof AndroidDebugEnvironment) =>
    environment[key]?.trim() ?? '';
  const usesCiFirebaseEmulators =
    value('AURA_ANDROID_CI_FIREBASE_EMULATORS') === 'true';

  if (usesCiFirebaseEmulators) {
    const missingCiAuth = [
      'AURA_ANDROID_CI_AUTH_EMAIL',
      'AURA_ANDROID_CI_AUTH_PASSWORD',
    ].filter((key) => !environment[key]?.trim());
    if (missingCiAuth.length > 0) {
      throw new Error(
        `Android CI Firebase emulators require a synthetic auth identity. Missing: ${missingCiAuth.join(', ')}`,
      );
    }

    return {
      VITE_FIREBASE_API_KEY: ANDROID_CI_FIREBASE_API_KEY,
      VITE_FIREBASE_AUTH_DOMAIN: `${ANDROID_CI_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      VITE_FIREBASE_PROJECT_ID: ANDROID_CI_FIREBASE_PROJECT_ID,
      VITE_FIREBASE_STORAGE_BUCKET: `${ANDROID_CI_FIREBASE_PROJECT_ID}.appspot.com`,
      VITE_FIREBASE_MESSAGING_SENDER_ID: ANDROID_CI_FIREBASE_MESSAGING_SENDER_ID,
      VITE_FIREBASE_APP_ID: ANDROID_CI_FIREBASE_APP_ID,
      VITE_FIRESTORE_DATABASE_ID: ANDROID_CI_FIRESTORE_DATABASE_ID,
      VITE_AURA_ANDROID_CI_FIREBASE_EMULATORS: 'true',
      VITE_AURA_ANDROID_CI_AUTH_EMAIL: value('AURA_ANDROID_CI_AUTH_EMAIL'),
      VITE_AURA_ANDROID_CI_AUTH_PASSWORD: value('AURA_ANDROID_CI_AUTH_PASSWORD'),
    };
  }

  return {
    VITE_FIREBASE_API_KEY:
      value('VITE_ANDROID_FIREBASE_API_KEY'),
    VITE_FIREBASE_AUTH_DOMAIN:
      value('VITE_ANDROID_FIREBASE_AUTH_DOMAIN'),
    VITE_FIREBASE_PROJECT_ID:
      value('VITE_ANDROID_FIREBASE_PROJECT_ID'),
    VITE_FIREBASE_STORAGE_BUCKET:
      value('VITE_ANDROID_FIREBASE_STORAGE_BUCKET'),
    VITE_FIREBASE_MESSAGING_SENDER_ID:
      value('VITE_ANDROID_FIREBASE_MESSAGING_SENDER_ID'),
    VITE_FIREBASE_APP_ID:
      value('VITE_ANDROID_FIREBASE_APP_ID'),
    VITE_FIRESTORE_DATABASE_ID:
      value('VITE_ANDROID_FIRESTORE_DATABASE_ID'),
  };
}
