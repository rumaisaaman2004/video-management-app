// Columns that are safe to return to clients; password_hash is selected only where needed.
const PUBLIC_COLUMNS = `id, name, email, role, created_at AS "createdAt", updated_at AS "updatedAt"`;

/** Data access for users. `db` is the pool or a transaction client. */
export function createUsersRepository(db) {
  return {
    async findById(id) {
      const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    /** Returns `{ user, passwordHash }` for login, or null if the email is not registered. */
    async findWithPasswordHashByEmail(email) {
      const { rows } = await db.query(
        `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
        [email],
      );
      if (!rows[0]) return null;

      const { password_hash: passwordHash, ...user } = rows[0];
      return { user, passwordHash };
    },

    async create({ name, email, passwordHash }) {
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING ${PUBLIC_COLUMNS}`,
        [name, email, passwordHash],
      );
      return rows[0];
    },
  };
}
