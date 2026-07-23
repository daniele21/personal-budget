import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import { resolveAuthRuntime } from './vite.auth-runtime';

export default defineConfig(({ mode, command }) => {
  const isE2EMode = mode === 'e2e';
  const authRuntime = resolveAuthRuntime(mode, command);

  return {
    plugins: [react(), tailwindcss()],
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
        '@': path.resolve(__dirname, '.'),
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
