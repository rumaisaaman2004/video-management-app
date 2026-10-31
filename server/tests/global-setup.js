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

/** Rebuilds the test database from migrations once before the whole test run. */
export default async function setup() {
  try {
    await prepareTestDatabase();
  } catch (err) {
    // Vitest can fail to print errors thrown from global setup, so report it directly.
    console.error(`\nTest database setup failed: ${err.message}\n`);
    throw err;
  } finally {
    await pool.end();
  }
}
