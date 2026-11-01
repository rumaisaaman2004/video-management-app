import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { promisify } from 'node:util';
import { MIGRATIONS_DIR } from './db/paths.js';

const execFileAsync = promisify(execFile);

async function checkDatabase(pool) {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    return [
      `Cannot reach the database (${err.message}). Is PostgreSQL running and DATABASE_URL correct?`,
    ];
  }

  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql'));
  const { rows } = await pool
    .query('SELECT name FROM schema_migrations')
    .catch(() => ({ rows: [] }));
  const applied = new Set(rows.map((row) => row.name));
  const pending = files.filter((name) => !applied.has(name));

  return pending.length > 0
    ? [
        `The database has ${pending.length} unapplied migration(s). Run: npm run db:migrate --workspace=server`,
      ]
    : [];
}

async function checkMediaTool(binary, settingName) {
  try {
    await execFileAsync(binary, ['-version']);
    return [];
  } catch {
    return [
      `"${binary}" could not be run, so uploads cannot be processed. Install FFmpeg or set ${settingName}.`,
    ];
  }
}

/**
 * Checks everything the server needs before it starts, so problems are reported
 * clearly up front instead of as confusing errors later. Returns a list of
 * problems, each with how to fix it; an empty list means everything is ready.
 */
export async function findStartupProblems({ pool, ffmpegPath, ffprobePath }) {
  const results = await Promise.all([
    checkDatabase(pool),
    checkMediaTool(ffmpegPath, 'FFMPEG_PATH'),
    checkMediaTool(ffprobePath, 'FFPROBE_PATH'),
  ]);
  return results.flat();
}
