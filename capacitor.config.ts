import type { CapacitorConfig } from '@capacitor/cli';

const webContentsDebuggingEnabled =
  process.env.CAPACITOR_WEB_CONTENTS_DEBUG === 'true';

const config: CapacitorConfig = {
  appId: 'com.staituned.aura',
  appName: 'Aura',
  webDir: 'dist',
  loggingBehavior: webContentsDebuggingEnabled ? 'debug' : 'none',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled,
    loggingBehavior: webContentsDebuggingEnabled ? 'debug' : 'none',
  },
};

export default config;
