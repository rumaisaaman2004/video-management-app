import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3's Sass source still uses @import and older Sass functions.
        // These four warnings come from Bootstrap itself (fixed in Bootstrap 6);
        // any other warning is still shown.
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
  server: {
    port: 5173,
    // Forward API calls to the Express server so the browser sees a single origin in development.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // The first test in each file also pays for the app's first render in a fresh worker
    // (about 4s on a busy machine, more with coverage). A test that truly hangs still fails.
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // Test helpers and the entry file that only mounts the app are not product code.
      exclude: ['src/test/**', 'src/main.jsx'],
      reporter: ['text-summary', 'html'],
    },
  },
});
