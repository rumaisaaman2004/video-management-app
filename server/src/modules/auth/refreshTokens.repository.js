// A reused token within this window is refused but does not revoke the session, so two
// browser tabs refreshing at the same moment do not log the user out.
const REUSE_GRACE_PERIOD = '30 seconds';

/** Data access for refresh tokens. `db` is the pool or a transaction client. */
export function createRefreshTokensRepository(db) {
  return {
    async create({ userId, familyId, tokenHash, expiresAt }) {
      await db.query(
        `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, familyId, tokenHash, expiresAt],
      );
    },

    /**
     * Finds a token and locks its row until the transaction ends, so concurrent
     * refreshes with the same token are processed one at a time.
     */
    async findByHashForUpdate(tokenHash) {
      const { rows } = await db.query(
        `SELECT id,
                user_id AS "userId",
                family_id AS "familyId",
                expires_at <= now() AS "isExpired",
                used_at IS NOT NULL AS "isUsed",
                used_at > now() - $2::interval AS "isWithinReuseGracePeriod"
         FROM refresh_tokens
         WHERE token_hash = $1
         FOR UPDATE`,
        [tokenHash, REUSE_GRACE_PERIOD],
      );
      return rows[0] ?? null;
    },

    async markUsed(id) {
      await db.query('UPDATE refresh_tokens SET used_at = now() WHERE id = $1', [id]);
    },

    async deleteFamily(familyId) {
      await db.query('DELETE FROM refresh_tokens WHERE family_id = $1', [familyId]);
    },

    /** Ends the login session the given token belongs to. */
    async deleteFamilyByTokenHash(tokenHash) {
      await db.query(
        `DELETE FROM refresh_tokens
         WHERE family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1)`,
        [tokenHash],
      );
    },

    async deleteExpiredForUser(userId) {
      await db.query('DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at <= now()', [
        userId,
      ]);
    },
  };
}
