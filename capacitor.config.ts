import type { CapacitorConfig } from '@capacitor/cli';

const webContentsDebuggingEnabled =
  process.env.CAPACITOR_WEB_CONTENTS_DEBUG === 'true';
const androidCiFirebaseEmulators =
  process.env.AURA_ANDROID_CI_FIREBASE_EMULATORS === 'true';

const config: CapacitorConfig = {
  appId: 'com.staituned.aura',
  appName: 'Aura',
  webDir: 'dist',
  loggingBehavior: webContentsDebuggingEnabled ? 'debug' : 'none',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: androidCiFirebaseEmulators,
    webContentsDebuggingEnabled,
    loggingBehavior: webContentsDebuggingEnabled ? 'debug' : 'none',
  },
};

export default config;
