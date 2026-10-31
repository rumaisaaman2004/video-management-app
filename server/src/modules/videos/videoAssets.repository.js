const ASSET_COLUMNS = `
  id, video_id AS "videoId", kind, label, storage_key AS "storageKey",
  mime_type AS "mimeType", size_bytes AS "sizeBytes", width, height`;

/** Data access for the files that belong to a video. `db` is the pool or a transaction client. */
export function createVideoAssetsRepository(db) {
  return {
    async create({ videoId, kind, label, storageKey, mimeType, sizeBytes, width, height }) {
      await db.query(
        `INSERT INTO video_assets
           (video_id, kind, label, storage_key, mime_type, size_bytes, width, height)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [videoId, kind, label, storageKey, mimeType, sizeBytes, width ?? null, height ?? null],
      );
    },

    async findByVideoId(videoId) {
      const { rows } = await db.query(
        `SELECT ${ASSET_COLUMNS} FROM video_assets WHERE video_id = $1 ORDER BY kind, height`,
        [videoId],
      );
      return rows;
    },

    async findSource(videoId) {
      const { rows } = await db.query(
        `SELECT ${ASSET_COLUMNS} FROM video_assets WHERE video_id = $1 AND kind = 'source'`,
        [videoId],
      );
      return rows[0] ?? null;
    },

    /** Removes thumbnail and rendition rows so processing can be re-run cleanly. */
    async deleteGenerated(videoId) {
      await db.query("DELETE FROM video_assets WHERE video_id = $1 AND kind <> 'source'", [
        videoId,
      ]);
    },
  };
}
