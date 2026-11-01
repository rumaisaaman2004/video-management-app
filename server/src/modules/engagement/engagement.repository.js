// Restricts lists to videos visitors can watch, for viewers who are not admins.
const WATCHABLE_ONLY = "AND v.status = 'ready' AND v.visibility = 'public'";

/**
 * Data access for per-user interactions with videos: likes, bookmarks and
 * watch history. `db` is the pool or a transaction client.
 */
export function createEngagementRepository(db) {
  /** One page of video IDs from a per-user table, plus the total, in the given order. */
  async function findVideoIdPage({ fromSql, userId, extraConditionSql = '', orderSql, page }) {
    const where = `WHERE x.user_id = $1 ${extraConditionSql}`;
    const [rows, count] = await Promise.all([
      db.query(
        `SELECT x.video_id AS "videoId"
         FROM ${fromSql} JOIN videos v ON v.id = x.video_id
         ${where} ORDER BY ${orderSql} LIMIT $2 OFFSET $3`,
        [userId, page.limit, page.offset],
      ),
      db.query(
        `SELECT count(*) AS total FROM ${fromSql} JOIN videos v ON v.id = x.video_id ${where}`,
        [userId],
      ),
    ]);
    return { videoIds: rows.rows.map((row) => row.videoId), total: count.rows[0].total };
  }

  return {
    async like(userId, videoId) {
      await db.query(
        'INSERT INTO likes (user_id, video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, videoId],
      );
    },

    async unlike(userId, videoId) {
      await db.query('DELETE FROM likes WHERE user_id = $1 AND video_id = $2', [userId, videoId]);
    },

    async countLikes(videoId) {
      const { rows } = await db.query('SELECT count(*) AS total FROM likes WHERE video_id = $1', [
        videoId,
      ]);
      return rows[0].total;
    },

    async bookmark(userId, videoId) {
      await db.query(
        'INSERT INTO bookmarks (user_id, video_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, videoId],
      );
    },

    async unbookmark(userId, videoId) {
      await db.query('DELETE FROM bookmarks WHERE user_id = $1 AND video_id = $2', [
        userId,
        videoId,
      ]);
    },

    /**
     * Saves the playback position. Once a video is completed it stays completed,
     * even if the user later rewatches it from the start.
     */
    async saveProgress(userId, videoId, { positionSeconds, completed }) {
      const { rows } = await db.query(
        `INSERT INTO watch_history (user_id, video_id, progress_seconds, completed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, video_id) DO UPDATE
           SET progress_seconds = EXCLUDED.progress_seconds,
               completed = watch_history.completed OR EXCLUDED.completed,
               last_watched_at = now()
         RETURNING progress_seconds AS "progressSeconds", completed`,
        [userId, videoId, positionSeconds, completed],
      );
      return rows[0];
    },

    /** Returns a Map of videoId → { liked, bookmarked, progressSeconds, completed }. */
    async findViewerStates(userId, videoIds) {
      const { rows } = await db.query(
        `SELECT ids.id AS "videoId",
                EXISTS (SELECT 1 FROM likes l WHERE l.user_id = $1 AND l.video_id = ids.id)
                  AS liked,
                EXISTS (SELECT 1 FROM bookmarks b WHERE b.user_id = $1 AND b.video_id = ids.id)
                  AS bookmarked,
                coalesce(wh.progress_seconds, 0) AS "progressSeconds",
                coalesce(wh.completed, false) AS completed
         FROM unnest($2::uuid[]) AS ids(id)
         LEFT JOIN watch_history wh ON wh.user_id = $1 AND wh.video_id = ids.id`,
        [userId, videoIds],
      );
      return new Map(rows.map(({ videoId, ...state }) => [videoId, state]));
    },

    findBookmarkedVideoIds(userId, { includeHidden, page }) {
      return findVideoIdPage({
        fromSql: 'bookmarks x',
        userId,
        extraConditionSql: includeHidden ? '' : WATCHABLE_ONLY,
        orderSql: 'x.created_at DESC',
        page,
      });
    },

    findHistoryVideoIds(userId, { includeHidden, inProgressOnly, page }) {
      const conditions = [
        includeHidden ? '' : WATCHABLE_ONLY,
        inProgressOnly ? 'AND x.progress_seconds > 0 AND NOT x.completed' : '',
      ];
      return findVideoIdPage({
        fromSql: 'watch_history x',
        userId,
        extraConditionSql: conditions.join(' '),
        orderSql: 'x.last_watched_at DESC',
        page,
      });
    },

    /** Returns false if the video was not in the user's history. */
    async deleteHistoryEntry(userId, videoId) {
      const { rowCount } = await db.query(
        'DELETE FROM watch_history WHERE user_id = $1 AND video_id = $2',
        [userId, videoId],
      );
      return rowCount > 0;
    },

    async clearHistory(userId) {
      await db.query('DELETE FROM watch_history WHERE user_id = $1', [userId]);
    },
  };
}
