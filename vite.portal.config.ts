import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { PRODUCTION_AUTH_RUNTIME } from './vite.auth-runtime';

export default defineConfig({
  root: 'portal',
  publicDir: '../public',
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@auth-runtime': path.resolve(__dirname, PRODUCTION_AUTH_RUNTIME),
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: '../portal-dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1_000,
  },
});

