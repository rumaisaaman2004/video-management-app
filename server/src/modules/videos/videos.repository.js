import { buildSetClause } from '../../db/sql.js';

// One row per video with its category, uploader, thumbnail version, likes and tag names.
const SELECT_VIDEOS = `
  SELECT v.id, v.title, v.description, v.status, v.visibility,
         v.duration_seconds AS "durationSeconds", v.view_count AS "viewCount",
         (SELECT count(*) FROM likes l WHERE l.video_id = v.id) AS "likeCount",
         v.created_at AS "createdAt", v.updated_at AS "updatedAt",
         c.id AS "categoryId", c.name AS "categoryName", c.slug AS "categorySlug",
         u.id AS "uploaderId", u.name AS "uploaderName",
         thumbnail.created_at AS "thumbnailCreatedAt",
         coalesce(tag_list.names, '{}') AS tags
  FROM videos v
  JOIN users u ON u.id = v.uploader_id
  LEFT JOIN categories c ON c.id = v.category_id
  LEFT JOIN video_assets thumbnail ON thumbnail.video_id = v.id AND thumbnail.kind = 'thumbnail'
  LEFT JOIN LATERAL (
    SELECT array_agg(t.name ORDER BY t.name) AS names
    FROM video_tags vt
    JOIN tags t ON t.id = vt.tag_id
    WHERE vt.video_id = v.id
  ) tag_list ON true`;

// Keys are validated by the request schema; ties are broken by id for stable paging.
const SORT_ORDERS = {
  newest: 'v.created_at DESC, v.id',
  oldest: 'v.created_at ASC, v.id',
  popular: 'v.view_count DESC, v.created_at DESC, v.id',
  title: 'v.title ASC, v.id',
};

const UPDATABLE_COLUMNS = {
  title: 'title',
  description: 'description',
  categoryId: 'category_id',
  visibility: 'visibility',
};

function toVideo({ categoryId, categoryName, categorySlug, uploaderId, uploaderName, ...video }) {
  return {
    ...video,
    category: categoryId ? { id: categoryId, name: categoryName, slug: categorySlug } : null,
    uploader: { id: uploaderId, name: uploaderName },
  };
}

/** Turns list filters into a WHERE clause with numbered parameters. */
function buildFilters({ status, visibility, categorySlug, tag, search }) {
  const params = [];
  const conditions = [];
  const param = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  const hasTag = (namesSql) =>
    `EXISTS (SELECT 1 FROM video_tags vt JOIN tags t ON t.id = vt.tag_id
             WHERE vt.video_id = v.id AND t.name = ${namesSql})`;

  if (status) conditions.push(`v.status = ${param(status)}`);
  if (visibility) conditions.push(`v.visibility = ${param(visibility)}`);
  if (categorySlug) conditions.push(`c.slug = ${param(categorySlug)}`);
  if (tag) conditions.push(hasTag(param(tag)));

  let rankSql = null;
  if (search) {
    const tsQuery = `to_tsquery('english', ${param(search.tsQuery)})`;
    conditions.push(`(v.search_vector @@ ${tsQuery} OR ${hasTag(`ANY(${param(search.words)})`)})`);
    rankSql = `ts_rank(v.search_vector, ${tsQuery})`;
  }

  return {
    whereSql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
    rankSql,
  };
}

/** Data access for videos. `db` is the pool or a transaction client. */
export function createVideosRepository(db) {
  return {
    /** Returns one page of videos plus the total number of matches. */
    async findPage({ filters, sort, limit, offset }) {
      const { whereSql, params, rankSql } = buildFilters(filters);
      const orderSql =
        sort === 'relevance' && rankSql ? `${rankSql} DESC, v.created_at DESC` : SORT_ORDERS[sort];

      const [page, count] = await Promise.all([
        db.query(
          `${SELECT_VIDEOS} ${whereSql}
           ORDER BY ${orderSql}
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset],
        ),
        db.query(
          `SELECT count(*) AS total
           FROM videos v LEFT JOIN categories c ON c.id = v.category_id
           ${whereSql}`,
          params,
        ),
      ]);

      return { videos: page.rows.map(toVideo), total: count.rows[0].total };
    },

    async findById(id) {
      const { rows } = await db.query(`${SELECT_VIDEOS} WHERE v.id = $1`, [id]);
      return rows[0] ? toVideo(rows[0]) : null;
    },

    /** Returns the videos with the given IDs, in no particular order. */
    async findByIds(ids) {
      const { rows } = await db.query(`${SELECT_VIDEOS} WHERE v.id = ANY($1::uuid[])`, [ids]);
      return rows.map(toVideo);
    },

    /** Returns the new video's ID. */
    async create({ uploaderId, categoryId, title, description, visibility }) {
      const { rows } = await db.query(
        `INSERT INTO videos (uploader_id, category_id, title, description, visibility)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [uploaderId, categoryId ?? null, title, description ?? null, visibility],
      );
      return rows[0].id;
    },

    /** Returns false if no video has the given ID. */
    async update(id, changes) {
      const { setClause, values } = buildSetClause(changes, UPDATABLE_COLUMNS, 2);
      // A tags-only edit changes no columns here, but the video must still exist.
      const sql = setClause
        ? `UPDATE videos SET ${setClause} WHERE id = $1`
        : 'SELECT 1 FROM videos WHERE id = $1';

      const { rowCount } = await db.query(sql, [id, ...values]);
      return rowCount > 0;
    },

    /** Returns false if no video has the given ID. */
    async delete(id) {
      const { rowCount } = await db.query('DELETE FROM videos WHERE id = $1', [id]);
      return rowCount > 0;
    },

    /** Counts a view on a watchable video. Returns false if the video is not watchable. */
    async incrementViewCount(id) {
      const { rowCount } = await db.query(
        `UPDATE videos SET view_count = view_count + 1
         WHERE id = $1 AND status = 'ready' AND visibility = 'public'`,
        [id],
      );
      return rowCount > 0;
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
