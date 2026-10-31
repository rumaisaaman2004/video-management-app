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
    categoryId: null,
    status: 'ready',
    visibility: 'public',
    ...overrides,
  };
  const { rows } = await pool.query(
    `INSERT INTO videos (uploader_id, category_id, title, status, visibility)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, category_id AS "categoryId"`,
    [uploaderId, video.categoryId, video.title, video.status, video.visibility],
  );
  return rows[0];
}
