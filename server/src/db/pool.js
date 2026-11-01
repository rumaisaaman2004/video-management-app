import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

// pg returns BIGINT (view counts, file sizes) as strings by default. Our values stay far
// below Number.MAX_SAFE_INTEGER, so parse them as numbers for simpler API responses.
const BIGINT_OID = 20;
pg.types.setTypeParser(BIGINT_OID, Number);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  // Fail fast when the pool is exhausted or the database is unreachable instead of hanging.
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  // Postgres cancels any single statement that runs longer than this.
  statement_timeout: 15_000,
});

// An idle client can lose its connection (e.g. database restart); log it instead of crashing.
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle database client');
});
