const VIDEO_COLUMNS = `
  id, uploader_id AS "uploaderId", category_id AS "categoryId", title, description,
  status, visibility, duration_seconds AS "durationSeconds", view_count AS "viewCount",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

/** Data access for videos. `db` is the pool or a transaction client. */
export function createVideosRepository(db) {
  return {
    async create({ uploaderId, categoryId, title, description, visibility }) {
      const { rows } = await db.query(
        `INSERT INTO videos (uploader_id, category_id, title, description, visibility)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${VIDEO_COLUMNS}`,
        [uploaderId, categoryId ?? null, title, description ?? null, visibility],
      );
      return rows[0];
    },

    async findById(id) {
      const { rows } = await db.query(`SELECT ${VIDEO_COLUMNS} FROM videos WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async findIdsByStatus(status) {
      const { rows } = await db.query(
        'SELECT id FROM videos WHERE status = $1 ORDER BY created_at',
        [status],
      );
      return rows.map((row) => row.id);
    },

    async markReady(id, { durationSeconds }) {
      await db.query("UPDATE videos SET status = 'ready', duration_seconds = $2 WHERE id = $1", [
        id,
        durationSeconds,
      ]);
    },

    async markFailed(id) {
      await db.query("UPDATE videos SET status = 'failed' WHERE id = $1", [id]);
    },
  };
}
