import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Test-only values: a throwaway signing secret, fast hashing, no auth rate limiting,
// a disposable media folder and a small upload limit.
// Set on process.env (not `test.env`) so global setup, which runs in the main process,
// sees them too; test workers inherit them.
const TEST_ENV = {
  JWT_SECRET: 'test-only-secret-not-used-anywhere-else-0123456789',
  BCRYPT_ROUNDS: '4',
  AUTH_RATE_LIMIT_MAX: '1000',
  STORAGE_DIR: path.join(os.tmpdir(), 'video-management-app-test-storage'),
  MAX_UPLOAD_SIZE_MB: '2',
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
    // Video tests run real FFmpeg encodes.
    testTimeout: 30_000,
  },
});
