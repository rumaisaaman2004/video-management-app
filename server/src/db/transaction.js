/**
 * Runs `work` inside a transaction on the given client, committing on success
 * and rolling back if it throws.
 */
export async function runInTransaction(client, work) {
  await client.query('BEGIN');
  try {
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * Checks out a client from the pool, runs `work` in a transaction on it, and
 * always returns the client to the pool.
 */
export async function withTransaction(pool, work) {
  const client = await pool.connect();
  try {
    return await runInTransaction(client, work);
  } finally {
    client.release();
  }
}
