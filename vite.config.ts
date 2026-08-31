import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { resolveAuthRuntime } from './vite.auth-runtime';
import { createAndroidDebugEnvOverrides } from './vite.android-runtime';
import { resolvePaymentDetectionRuntime } from './vite.payment-detection-runtime';

const TEST_FIREBASE_DEFINE = {
  'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('aura-test-api-key'),
  'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify('aura-test.local'),
  'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('aura-test'),
  'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify('aura-test.invalid'),
  'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify('000000000000'),
  'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify('1:000000000000:web:aura-test'),
  'import.meta.env.VITE_FIRESTORE_DATABASE_ID': JSON.stringify('budget-db'),
};

export default defineConfig(({ mode, command }) => {
  const isTestMode = mode === 'test';
  const isE2EMode = mode === 'e2e';
  const usesSyntheticFirebase = isTestMode || isE2EMode;
  const authRuntime = resolveAuthRuntime(mode, command);
  const paymentDetectionRuntime = resolvePaymentDetectionRuntime(mode, command);
  const environment = loadEnv(mode, process.cwd(), '');
  createAndroidDebugEnvOverrides(mode, environment);

  return {
    plugins: [react(), tailwindcss()],
    define: usesSyntheticFirebase ? TEST_FIREBASE_DEFINE : undefined,
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      // Bound jsdom/Web Crypto concurrency to avoid process-pool starvation
      // on developer machines while preserving the default per-test timeout.
      maxWorkers: 2,
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@auth-runtime': path.resolve(__dirname, authRuntime),
        '@payment-detection-runtime': path.resolve(__dirname, paymentDetectionRuntime),
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // ExcelJS is an intentionally on-demand import used only for .xlsx parsing.
      // Keep the general warning ceiling just above its current minified size.
      chunkSizeWarningLimit: 1_000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;

            if (id.includes('/@firebase/') || id.includes('/firebase/')) return 'firebase';
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router/') ||
              id.includes('/react-router-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor';
            }
            if (
              id.includes('/motion/') ||
              id.includes('/motion-dom/') ||
              id.includes('/motion-utils/')
            ) {
              return 'motion';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      ...(isE2EMode
        ? {
            host: '127.0.0.1',
            port: 4173,
            strictPort: true,
          }
        : {}),
      // HMR can be disabled in constrained hosted editors via DISABLE_HMR.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
