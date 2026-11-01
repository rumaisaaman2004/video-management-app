import { randomUUID } from 'node:crypto';

/** Inserts rows directly so tests can set up state without going through the API. */

export async function createUser(pool, overrides = {}) {
  const user = {
    name: 'Test User',
    email: `user-${randomUUID()}@example.com`,
    role: 'user',
    ...overrides,
  };
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, 'not-a-real-hash', $3)
     RETURNING id, name, email, role`,
    [user.name, user.email, user.role],
  );
  return rows[0];
}

export async function createCategory(pool, overrides = {}) {
  const suffix = randomUUID().slice(0, 8);
  const category = { name: `Category ${suffix}`, slug: `category-${suffix}`, ...overrides };
  const { rows } = await pool.query(
    'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
    [category.name, category.slug],
  );
  return rows[0];
}

export async function createVideo(pool, { uploaderId, ...overrides }) {
  const video = {
    title: 'Test Video',
    description: null,
    categoryId: null,
    status: 'ready',
    visibility: 'public',
    viewCount: 0,
    durationSeconds: 100,
    createdAt: new Date(),
    ...overrides,
  };
  const { rows } = await pool.query(
    `INSERT INTO videos
       (uploader_id, category_id, title, description, status, visibility, view_count,
        duration_seconds, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, category_id AS "categoryId"`,
    [
      uploaderId,
      video.categoryId,
      video.title,
      video.description,
      video.status,
      video.visibility,
      video.viewCount,
      video.durationSeconds,
      video.createdAt,
    ],
  );
  return rows[0];
}

export async function tagVideo(pool, videoId, names) {
  await pool.query(
    'INSERT INTO tags (name) SELECT unnest($1::text[]) ON CONFLICT (name) DO NOTHING',
    [names],
  );
  await pool.query(
    'INSERT INTO video_tags (video_id, tag_id) SELECT $1, id FROM tags WHERE name = ANY($2)',
    [videoId, names],
  );
}
