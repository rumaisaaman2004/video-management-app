/** Empties every application table so each test starts from a known state. */
export async function truncateAllTables(pool) {
  const { rows } = await pool.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> 'schema_migrations'
  `);
  if (rows.length === 0) return;

  const tables = rows.map((row) => `"${row.tablename}"`).join(', ');
  await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
