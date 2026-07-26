export const ANDROID_DEBUG_MODE = 'android-debug';

const REQUIRED_ANDROID_DEBUG_ENV_KEYS = [
  'VITE_ANDROID_FIREBASE_API_KEY',
  'VITE_ANDROID_FIREBASE_AUTH_DOMAIN',
  'VITE_ANDROID_FIREBASE_PROJECT_ID',
  'VITE_ANDROID_FIREBASE_STORAGE_BUCKET',
  'VITE_ANDROID_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_ANDROID_FIREBASE_APP_ID',
  'VITE_ANDROID_FIREBASE_WEB_CLIENT_ID',
] as const;

export type AndroidDebugEnvironment = Record<
  (typeof REQUIRED_ANDROID_DEBUG_ENV_KEYS)[number],
  string
> & {
  VITE_ANDROID_FIRESTORE_DATABASE_ID?: string;
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
    VITE_FIREBASE_WEB_CLIENT_ID:
      value('VITE_ANDROID_FIREBASE_WEB_CLIENT_ID'),
    VITE_FIRESTORE_DATABASE_ID:
      value('VITE_ANDROID_FIRESTORE_DATABASE_ID'),
    // AI-assisted import is deliberately unavailable in Android debug builds.
    VITE_GEMINI_API_KEY: '',
  };
}
