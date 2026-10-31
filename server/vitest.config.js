import { defineConfig } from 'vitest/config';

// Test-only values: a throwaway signing secret, fast hashing and no auth rate limiting.
// Set on process.env (not `test.env`) so global setup, which runs in the main process,
// sees them too; test workers inherit them.
const TEST_ENV = {
  JWT_SECRET: 'test-only-secret-not-used-anywhere-else-0123456789',
  BCRYPT_ROUNDS: '4',
  AUTH_RATE_LIMIT_MAX: '1000',
};

for (const [name, value] of Object.entries(TEST_ENV)) {
  process.env[name] ??= value;
}

export default defineConfig({
  test: {
    globalSetup: './tests/global-setup.js',
    setupFiles: './tests/setup.js',
    // Test files share one database, so run them one at a time.
    fileParallelism: false,
  },
});
