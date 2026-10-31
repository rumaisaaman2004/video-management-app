import { afterAll } from 'vitest';
import { pool } from '../src/db/pool.js';

// Each test file gets its own pool instance; close it so connections are not leaked.
afterAll(async () => {
  await pool.end();
});
