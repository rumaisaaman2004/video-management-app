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
  },
});
