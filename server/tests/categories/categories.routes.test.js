import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createContainer } from '../../src/container.js';
import { pool } from '../../src/db/pool.js';
import { bearerToken } from '../helpers/auth.js';
import { truncateAllTables } from '../helpers/db.js';
import { createCategory, createUser, createVideo } from '../helpers/fixtures.js';

const app = createApp(createContainer({ pool }));
const ADMIN = bearerToken('admin');
const USER = bearerToken('user');

function createAsAdmin(body) {
  return request(app).post('/api/categories').set('Authorization', ADMIN).send(body);
}

describe('categories routes', () => {
  afterEach(() => truncateAllTables(pool));

  describe('GET /api/categories', () => {
    it('lists categories alphabetically for anonymous visitors', async () => {
      await createCategory(pool, { name: 'Science', slug: 'science' });
      await createCategory(pool, { name: 'Design', slug: 'design' });

      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.data.map((category) => category.name)).toEqual(['Design', 'Science']);
    });

    it('counts only ready, public videos', async () => {
      const category = await createCategory(pool);
      const { id: uploaderId } = await createUser(pool);
      const categoryId = category.id;
      await createVideo(pool, { uploaderId, categoryId });
      await createVideo(pool, { uploaderId, categoryId, status: 'processing' });
      await createVideo(pool, { uploaderId, categoryId, visibility: 'private' });

      const res = await request(app).get('/api/categories');

      expect(res.body.data[0].videoCount).toBe(1);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('returns one category', async () => {
      const category = await createCategory(pool);

      const res = await request(app).get(`/api/categories/${category.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: category.id, name: category.name, videoCount: 0 });
    });

    it('responds 404 for an unknown ID', async () => {
      const res = await request(app).get(`/api/categories/${randomUUID()}`);

      expect(res.status).toBe(404);
    });

    it('responds 400 for a malformed ID', async () => {
      const res = await request(app).get('/api/categories/not-an-id');

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('params.id');
    });
  });

  describe('POST /api/categories', () => {
    it('lets an admin create a category with a generated slug', async () => {
      const res = await createAsAdmin({ name: 'Café & Web Basics', description: 'Intro' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Café & Web Basics',
        slug: 'cafe-web-basics',
        description: 'Intro',
        videoCount: 0,
      });
    });

    it('stores an empty description as null', async () => {
      const res = await createAsAdmin({ name: 'Physics', description: '   ' });

      expect(res.body.data.description).toBeNull();
    });

    it('rejects anonymous visitors and non-admin users', async () => {
      const anonymous = await request(app).post('/api/categories').send({ name: 'Physics' });
      const user = await request(app)
        .post('/api/categories')
        .set('Authorization', USER)
        .send({ name: 'Physics' });

      expect(anonymous.status).toBe(401);
      expect(user.status).toBe(403);
    });

    it('names the duplicated field on conflict', async () => {
      await createAsAdmin({ name: 'Physics' });

      const sameName = await createAsAdmin({ name: 'Physics', slug: 'physics-2' });
      const sameSlug = await createAsAdmin({ name: 'Physics 2', slug: 'physics' });

      expect(sameName.status).toBe(409);
      expect(sameName.body.error.message).toBe('A category with this name already exists');
      expect(sameSlug.status).toBe(409);
      expect(sameSlug.body.error.message).toBe('A category with this slug already exists');
    });

    it('asks for a slug when one cannot be generated from the name', async () => {
      const res = await createAsAdmin({ name: '!!!' });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('body.slug');
    });

    it('validates name and slug format', async () => {
      const res = await createAsAdmin({ name: '', slug: 'Not A Slug' });

      expect(res.status).toBe(400);
      expect(res.body.error.details.map((issue) => issue.field)).toEqual([
        'body.name',
        'body.slug',
      ]);
    });
  });

  describe('PATCH /api/categories/:id', () => {
    it('updates only the provided fields and keeps the slug stable', async () => {
      const category = await createCategory(pool, { name: 'Physics', slug: 'physics' });

      const res = await request(app)
        .patch(`/api/categories/${category.id}`)
        .set('Authorization', ADMIN)
        .send({ name: 'Applied Physics' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'Applied Physics', slug: 'physics' });
    });

    it('can clear the description with null', async () => {
      const created = await createAsAdmin({ name: 'Physics', description: 'Old' });

      const res = await request(app)
        .patch(`/api/categories/${created.body.data.id}`)
        .set('Authorization', ADMIN)
        .send({ description: null });

      expect(res.body.data.description).toBeNull();
    });

    it('rejects an empty update', async () => {
      const category = await createCategory(pool);

      const res = await request(app)
        .patch(`/api/categories/${category.id}`)
        .set('Authorization', ADMIN)
        .send({});

      expect(res.status).toBe(400);
    });

    it('responds 404 for an unknown ID', async () => {
      const res = await request(app)
        .patch(`/api/categories/${randomUUID()}`)
        .set('Authorization', ADMIN)
        .send({ name: 'Anything' });

      expect(res.status).toBe(404);
    });

    it('responds 409 when renaming to an existing name', async () => {
      await createCategory(pool, { name: 'Physics', slug: 'physics' });
      const other = await createCategory(pool, { name: 'Chemistry', slug: 'chemistry' });

      const res = await request(app)
        .patch(`/api/categories/${other.id}`)
        .set('Authorization', ADMIN)
        .send({ name: 'Physics' });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('deletes the category and keeps its videos without a category', async () => {
      const category = await createCategory(pool);
      const { id: uploaderId } = await createUser(pool);
      const video = await createVideo(pool, { uploaderId, categoryId: category.id });

      const res = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', ADMIN);

      const { rows } = await pool.query('SELECT category_id FROM videos WHERE id = $1', [video.id]);
      expect(res.status).toBe(204);
      expect(rows[0].category_id).toBeNull();
    });

    it('responds 404 for an unknown ID', async () => {
      const res = await request(app)
        .delete(`/api/categories/${randomUUID()}`)
        .set('Authorization', ADMIN);

      expect(res.status).toBe(404);
    });

    it('is admin-only', async () => {
      const category = await createCategory(pool);

      const res = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', USER);

      expect(res.status).toBe(403);
    });
  });
});
