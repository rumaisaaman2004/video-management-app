import { buildSetClause } from '../../db/sql.js';

// Counts and covers only use watchable videos, so hidden videos never leak through a playlist.
const SELECT_PLAYLISTS = `
  SELECT p.id, p.owner_id AS "ownerId", u.name AS "ownerName",
         p.title, p.description, p.visibility,
         p.created_at AS "createdAt", p.updated_at AS "updatedAt",
         (SELECT count(*)
          FROM playlist_videos pv
          JOIN videos v ON v.id = pv.video_id
          WHERE pv.playlist_id = p.id AND v.status = 'ready' AND v.visibility = 'public'
         ) AS "videoCount",
         cover.video_id AS "coverVideoId",
         cover.thumbnail_created_at AS "coverThumbnailCreatedAt"
  FROM playlists p
  JOIN users u ON u.id = p.owner_id
  LEFT JOIN LATERAL (
    SELECT pv.video_id, a.created_at AS thumbnail_created_at
    FROM playlist_videos pv
    JOIN videos v ON v.id = pv.video_id AND v.status = 'ready' AND v.visibility = 'public'
    JOIN video_assets a ON a.video_id = v.id AND a.kind = 'thumbnail'
    WHERE pv.playlist_id = p.id
    ORDER BY pv.position
    LIMIT 1
  ) cover ON true`;

const UPDATABLE_COLUMNS = { title: 'title', description: 'description', visibility: 'visibility' };

/** Data access for playlists and their ordered videos. `db` is the pool or a transaction client. */
export function createPlaylistsRepository(db) {
  return {
    async findById(id) {
      const { rows } = await db.query(`${SELECT_PLAYLISTS} WHERE p.id = $1`, [id]);
      return rows[0] ?? null;
    },

    async findByOwner(ownerId) {
      const { rows } = await db.query(
        `${SELECT_PLAYLISTS} WHERE p.owner_id = $1 ORDER BY p.updated_at DESC`,
        [ownerId],
      );
      return rows;
    },

    /** Returns the new playlist's ID. */
    async create({ ownerId, title, description, visibility }) {
      const { rows } = await db.query(
        `INSERT INTO playlists (owner_id, title, description, visibility)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [ownerId, title, description ?? null, visibility],
      );
      return rows[0].id;
    },

    async update(id, changes) {
      const { setClause, values } = buildSetClause(changes, UPDATABLE_COLUMNS, 2);
      await db.query(`UPDATE playlists SET ${setClause} WHERE id = $1`, [id, ...values]);
    },

    async delete(id) {
      await db.query('DELETE FROM playlists WHERE id = $1', [id]);
    },

    /** Locks the playlist row until the transaction ends, serializing edits to its videos. */
    async lockForUpdate(id) {
      await db.query('SELECT id FROM playlists WHERE id = $1 FOR UPDATE', [id]);
    },

    /** Marks the playlist as recently changed (the trigger sets updated_at). */
    async touch(id) {
      await db.query('UPDATE playlists SET title = title WHERE id = $1', [id]);
    },

    async findVideoIds(id) {
      const { rows } = await db.query(
        'SELECT video_id AS "videoId" FROM playlist_videos WHERE playlist_id = $1 ORDER BY position',
        [id],
      );
      return rows.map((row) => row.videoId);
    },

    async countVideos(id) {
      const { rows } = await db.query(
        'SELECT count(*) AS total FROM playlist_videos WHERE playlist_id = $1',
        [id],
      );
      return rows[0].total;
    },

    /** Adds a video at the end. Throws a unique violation if it is already in the playlist. */
    async appendVideo(id, videoId) {
      await db.query(
        `INSERT INTO playlist_videos (playlist_id, video_id, position)
         SELECT $1, $2, coalesce(max(position) + 1, 0)
         FROM playlist_videos WHERE playlist_id = $1`,
        [id, videoId],
      );
    },

    /** Removes a video and closes the gap it leaves. Returns false if it was not in the playlist. */
    async removeVideo(id, videoId) {
      const { rows } = await db.query(
        'DELETE FROM playlist_videos WHERE playlist_id = $1 AND video_id = $2 RETURNING position',
        [id, videoId],
      );
      if (rows.length === 0) return false;

      await db.query(
        `UPDATE playlist_videos SET position = position - 1
         WHERE playlist_id = $1 AND position > $2`,
        [id, rows[0].position],
      );
      return true;
    },

    /** Sets positions to match `videoIds` order. Valid because position uniqueness is deferred. */
    async reorder(id, videoIds) {
      await db.query(
        `UPDATE playlist_videos pv SET position = ordered.index - 1
         FROM unnest($2::uuid[]) WITH ORDINALITY AS ordered(video_id, index)
         WHERE pv.playlist_id = $1 AND pv.video_id = ordered.video_id`,
        [id, videoIds],
      );
    },
  };
}
