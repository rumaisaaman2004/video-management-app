import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { runInTransaction, withTransaction } from './transaction.js';

// Fixed key for pg_advisory_lock so only one process can migrate at a time.
const MIGRATION_LOCK_KEY = 4_820_241;

// e.g. 0004_create_videos.sql
const SQL_FILE_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/;

async function loadSqlFiles(dir) {
  const names = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort();

  const invalid = names.filter((name) => !SQL_FILE_PATTERN.test(name));
  if (invalid.length > 0) {
    throw new Error(`Invalid SQL file names in ${dir}: ${invalid.join(', ')}`);
  }

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(path.join(dir, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      return { name, sql, checksum };
    }),
  );
}

// Applied migrations must never change; schema changes go in a new migration file.
function assertAppliedUnchanged(files, applied) {
  const filesByName = new Map(files.map((file) => [file.name, file]));

  for (const [name, checksum] of applied) {
    const file = filesByName.get(name);
    if (!file) {
      throw new Error(`Migration ${name} was applied but its file is missing`);
    }
    if (file.checksum !== checksum) {
      throw new Error(`Migration ${name} was modified after being applied`);
    }
  }
}

/**
 * Applies pending migrations in file-name order, each in its own transaction.
 * Returns the names of the migrations that were applied.
 */
export async function migrate(pool, migrationsDir) {
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        checksum   text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT name, checksum FROM schema_migrations');
    const applied = new Map(rows.map((row) => [row.name, row.checksum]));
    const files = await loadSqlFiles(migrationsDir);
    assertAppliedUnchanged(files, applied);

    const pending = files.filter((file) => !applied.has(file.name));
    for (const migration of pending) {
      await runInTransaction(client, async (tx) => {
        await tx.query(migration.sql);
        await tx.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
          migration.name,
          migration.checksum,
        ]);
      }).catch((err) => {
        throw new Error(`Migration ${migration.name} failed: ${err.message}`, { cause: err });
      });
    }

    return pending.map((migration) => migration.name);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    client.release();
  }
}

/**
 * Runs every seed file in one transaction. Seed files must be idempotent
 * (e.g. INSERT ... ON CONFLICT DO NOTHING) so they can be re-run safely.
 */
export async function seed(pool, seedsDir) {
  const files = await loadSqlFiles(seedsDir);

  await withTransaction(pool, async (tx) => {
    for (const file of files) {
      await tx.query(file.sql);
    }
  });

  return files.map((file) => file.name);
}

/** Drops every table, function and trigger by recreating the public schema. */
export async function dropSchema(pool) {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}
