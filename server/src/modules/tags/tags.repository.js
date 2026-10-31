/** Data access for tags. `db` is the pool or a transaction client. */
export function createTagsRepository(db) {
  return {
    /** All tags with how many watchable (ready, public) videos use each, most used first. */
    async findAllWithCounts() {
      const { rows } = await db.query(`
        SELECT t.name,
               count(v.id) FILTER (WHERE v.status = 'ready' AND v.visibility = 'public')
                 AS "videoCount"
        FROM tags t
        LEFT JOIN video_tags vt ON vt.tag_id = t.id
        LEFT JOIN videos v ON v.id = vt.video_id
        GROUP BY t.id
        ORDER BY "videoCount" DESC, t.name`);
      return rows;
    },

    /** Sets a video's tags to exactly `names`, creating tags that do not exist yet. */
    async replaceVideoTags(videoId, names) {
      await db.query(
        'INSERT INTO tags (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING',
        [names],
      );
      await db.query('DELETE FROM video_tags WHERE video_id = $1', [videoId]);
      await db.query(
        `INSERT INTO video_tags (video_id, tag_id)
         SELECT $1, id FROM tags WHERE name = ANY($2::text[])`,
        [videoId, names],
      );
    },
  };
}
