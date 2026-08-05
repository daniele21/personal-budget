import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { PRODUCTION_AUTH_RUNTIME } from './vite.auth-runtime';

const PROJECT_ROOT = path.resolve(__dirname);
const REQUIRED_FIREBASE_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export default defineConfig(({ mode, command }) => {
  const environment = loadEnv(mode, PROJECT_ROOT, '');
  if (command === 'build') {
    const missing = REQUIRED_FIREBASE_ENV.filter((key) => !environment[key]?.trim());
    if (missing.length > 0) {
      throw new Error(`Portal build requires Firebase configuration: ${missing.join(', ')}`);
    }
  }

  return {
    root: 'portal',
    envDir: PROJECT_ROOT,
    publicDir: '../public',
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@auth-runtime': path.resolve(__dirname, PRODUCTION_AUTH_RUNTIME),
        '@': PROJECT_ROOT,
      },
    },
    build: {
      outDir: '../portal-dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1_000,
    },
  };
});
