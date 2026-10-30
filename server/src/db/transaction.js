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
