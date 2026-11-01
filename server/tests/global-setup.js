import { rm } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../src/config/env.js';
import { dropSchema, migrate } from '../src/db/migrator.js';
import { MIGRATIONS_DIR } from '../src/db/paths.js';
import { pool } from '../src/db/pool.js';

async function prepareTestDatabase() {
  const databaseName = new URL(env.DATABASE_URL).pathname.slice(1);

  // Guard against wiping a real database if .env.test is missing or misconfigured.
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${databaseName}": name must end in _test`);
  }

  await dropSchema(pool);
  await migrate(pool, MIGRATIONS_DIR);
}

async function clearTestStorage() {
  // Same idea as the database guard: never delete a folder that is not clearly for tests.
  if (!path.basename(env.STORAGE_DIR).includes('test')) {
    throw new Error(`Refusing to clear storage "${env.STORAGE_DIR}": name must contain "test"`);
  }
  await rm(env.STORAGE_DIR, { recursive: true, force: true });
}

/** Rebuilds the test database and empties test media storage before the whole test run. */
export default async function setup() {
  try {
    await prepareTestDatabase();
    await clearTestStorage();
  } catch (err) {
    // Vitest can fail to print errors thrown from global setup, so report it directly.
    console.error(`\nTest setup failed: ${err.message}\n`);
    throw err;
  } finally {
    await pool.end();
  }
}
