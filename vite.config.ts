import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages is served under /Revix/, so every asset URL must be prefixed.
export default defineConfig({
  base: '/Revix/',
  plugins: [react(), tailwindcss()],
  build: {
    // Hash routing means any deep link falls back to index.html already,
    // but keep a 404.html copy so unknown paths behave on Pages.
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
