import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createContainer } from '../../src/container.js';
import { pool } from '../../src/db/pool.js';
import { bearerToken } from '../helpers/auth.js';
import { truncateAllTables } from '../helpers/db.js';
import { createCategory, createUser, createVideo, tagVideo } from '../helpers/fixtures.js';

const app = createApp(createContainer({ pool }));
const ADMIN = bearerToken('admin');

let uploaderId;

beforeEach(async () => {
  ({ id: uploaderId } = await createUser(pool, { role: 'admin', name: 'Dr. Ada' }));
});

afterEach(() => truncateAllTables(pool));

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function listVideos(query = {}, token) {
  const req = request(app).get('/api/videos').query(query);
  return token ? req.set('Authorization', token) : req;
}

const titlesOf = (res) => res.body.data.map((video) => video.title);

describe('GET /api/videos', () => {
  it('shows visitors only ready, public videos, newest first', async () => {
    await createVideo(pool, { uploaderId, title: 'Older', createdAt: daysAgo(2) });
    await createVideo(pool, { uploaderId, title: 'Newer', createdAt: daysAgo(1) });
    await createVideo(pool, { uploaderId, title: 'Private', visibility: 'private' });
    await createVideo(pool, { uploaderId, title: 'Processing', status: 'processing' });
    await createVideo(pool, { uploaderId, title: 'Failed', status: 'failed' });

    const res = await listVideos();

    expect(res.status).toBe(200);
    expect(titlesOf(res)).toEqual(['Newer', 'Older']);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 12, total: 2, totalPages: 1 });
  });

  it('returns cards with category, uploader and tags', async () => {
    const category = await createCategory(pool, { name: 'Web', slug: 'web' });
    const video = await createVideo(pool, { uploaderId, categoryId: category.id });
    await tagVideo(pool, video.id, ['react', 'beginner']);

    const [card] = (await listVideos()).body.data;

    expect(card).toMatchObject({
      id: video.id,
      category: { id: category.id, name: 'Web', slug: 'web' },
      uploader: { id: uploaderId, name: 'Dr. Ada' },
      tags: ['beginner', 'react'],
      thumbnailUrl: null,
    });
    expect(card.renditions).toBeUndefined();
  });

  it('paginates and reports totals even past the last page', async () => {
    for (const day of [1, 2, 3]) {
      await createVideo(pool, { uploaderId, title: `Day ${day}`, createdAt: daysAgo(day) });
    }

    const first = await listVideos({ pageSize: 2 });
    const pastEnd = await listVideos({ pageSize: 2, page: 3 });

    expect(titlesOf(first)).toEqual(['Day 1', 'Day 2']);
    expect(first.body.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(pastEnd.body.data).toEqual([]);
    expect(pastEnd.body.meta.total).toBe(3);
  });

  describe('search', () => {
    beforeEach(async () => {
      await createVideo(pool, { uploaderId, title: 'React Hooks in Depth' });
      await createVideo(pool, {
        uploaderId,
        title: 'State Management',
        description: 'Compares hooks with Redux',
      });
      const tagged = await createVideo(pool, { uploaderId, title: 'API Design' });
      await tagVideo(pool, tagged.id, ['graphql']);
    });

    it('matches word prefixes while typing', async () => {
      expect(titlesOf(await listVideos({ q: 'reac hoo' }))).toEqual(['React Hooks in Depth']);
    });

    it('ranks title matches above description matches', async () => {
      expect(titlesOf(await listVideos({ q: 'hooks' }))).toEqual([
        'React Hooks in Depth',
        'State Management',
      ]);
    });

    it('also matches tag names', async () => {
      expect(titlesOf(await listVideos({ q: 'graphql' }))).toEqual(['API Design']);
    });

    it('ignores symbols that are not searchable', async () => {
      const res = await listVideos({ q: "'):* & | !" });

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(3);
    });
  });

  describe('filters and sorting', () => {
    it('filters by category slug and tag together', async () => {
      const web = await createCategory(pool, { name: 'Web', slug: 'web' });
      const match = await createVideo(pool, { uploaderId, title: 'Match', categoryId: web.id });
      const wrongTag = await createVideo(pool, {
        uploaderId,
        title: 'Wrong tag',
        categoryId: web.id,
      });
      await tagVideo(pool, match.id, ['css']);
      await tagVideo(pool, wrongTag.id, ['html']);

      expect(titlesOf(await listVideos({ category: 'web', tag: 'CSS' }))).toEqual(['Match']);
    });

    it.each([
      ['popular', ['Popular', 'Alpha', 'Zulu']],
      ['title', ['Alpha', 'Popular', 'Zulu']],
      ['oldest', ['Zulu', 'Popular', 'Alpha']],
      ['least-viewed', ['Alpha', 'Zulu', 'Popular']],
      ['title-desc', ['Zulu', 'Popular', 'Alpha']],
    ])('sorts by %s', async (sort, expected) => {
      await createVideo(pool, { uploaderId, title: 'Zulu', viewCount: 5, createdAt: daysAgo(3) });
      await createVideo(pool, {
        uploaderId,
        title: 'Popular',
        viewCount: 99,
        createdAt: daysAgo(2),
      });
      await createVideo(pool, { uploaderId, title: 'Alpha', viewCount: 5, createdAt: daysAgo(1) });

      expect(titlesOf(await listVideos({ sort }))).toEqual(expected);
    });

    it('lets admins list hidden videos by status and visibility', async () => {
      await createVideo(pool, { uploaderId, title: 'Public' });
      await createVideo(pool, { uploaderId, title: 'Processing', status: 'processing' });

      const asAdmin = await listVideos({ status: 'processing' }, ADMIN);
      const asVisitor = await listVideos({ status: 'processing' });

      expect(titlesOf(asAdmin)).toEqual(['Processing']);
      expect(titlesOf(asVisitor)).toEqual(['Public']);
    });

    it('rejects invalid query parameters', async () => {
      const res = await listVideos({ pageSize: 500, sort: 'random' });

      expect(res.status).toBe(400);
      expect(res.body.error.details.map((issue) => issue.field)).toEqual([
        'query.pageSize',
        'query.sort',
      ]);
    });
  });
});

describe('GET /api/videos/:id', () => {
  it('returns a public video with its renditions list', async () => {
    const video = await createVideo(pool, { uploaderId, title: 'Hooks' });

    const res = await request(app).get(`/api/videos/${video.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: video.id, title: 'Hooks', renditions: [] });
  });

  it('hides private and unprocessed videos from visitors with 404', async () => {
    const hidden = await createVideo(pool, { uploaderId, visibility: 'private' });

    const asVisitor = await request(app).get(`/api/videos/${hidden.id}`);
    const asUser = await request(app)
      .get(`/api/videos/${hidden.id}`)
      .set('Authorization', bearerToken('user'));
    const asAdmin = await request(app).get(`/api/videos/${hidden.id}`).set('Authorization', ADMIN);

    expect(asVisitor.status).toBe(404);
    expect(asUser.status).toBe(404);
    expect(asAdmin.status).toBe(200);
  });
});

describe('PATCH /api/videos/:id', () => {
  function patchVideo(id, body, token = ADMIN) {
    return request(app).patch(`/api/videos/${id}`).set('Authorization', token).send(body);
  }

  it('updates details and replaces tags with a normalized, de-duplicated set', async () => {
    const category = await createCategory(pool);
    const video = await createVideo(pool, { uploaderId });
    await tagVideo(pool, video.id, ['old']);

    const res = await patchVideo(video.id, {
      title: 'New title',
      visibility: 'private',
      categoryId: category.id,
      tags: ['React', ' react ', 'C++', 'node.js'],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: 'New title',
      visibility: 'private',
      category: { id: category.id },
      tags: ['c++', 'node.js', 'react'],
    });
  });

  it('removes the category with null and all tags with an empty list', async () => {
    const category = await createCategory(pool);
    const video = await createVideo(pool, { uploaderId, categoryId: category.id });
    await tagVideo(pool, video.id, ['react']);

    const res = await patchVideo(video.id, { categoryId: null, tags: [] });

    expect(res.body.data).toMatchObject({ category: null, tags: [] });
  });

  it('rejects an unknown category with a field error', async () => {
    const video = await createVideo(pool, { uploaderId });

    const res = await patchVideo(video.id, { categoryId: randomUUID() });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('body.categoryId');
  });

  it('rejects empty updates, too many tags and invalid tag characters', async () => {
    const video = await createVideo(pool, { uploaderId });
    const tooMany = Array.from({ length: 11 }, (_, index) => `tag${index}`);

    expect((await patchVideo(video.id, {})).status).toBe(400);
    expect((await patchVideo(video.id, { tags: tooMany })).status).toBe(400);
    expect((await patchVideo(video.id, { tags: ['<script>'] })).status).toBe(400);
  });

  it('responds 404 for an unknown video and 403 for non-admins', async () => {
    const video = await createVideo(pool, { uploaderId });

    expect((await patchVideo(randomUUID(), { title: 'x' })).status).toBe(404);
    expect((await patchVideo(video.id, { title: 'x' }, bearerToken('user'))).status).toBe(403);
  });
});

describe('DELETE /api/videos/:id', () => {
  it('deletes the video and its tags links', async () => {
    const video = await createVideo(pool, { uploaderId });
    await tagVideo(pool, video.id, ['react']);

    const res = await request(app).delete(`/api/videos/${video.id}`).set('Authorization', ADMIN);
    const again = await request(app).delete(`/api/videos/${video.id}`).set('Authorization', ADMIN);

    expect(res.status).toBe(204);
    expect(again.status).toBe(404);
    expect((await pool.query('SELECT count(*) FROM video_tags')).rows[0].count).toBe(0);
  });
});

describe('POST /api/videos/:id/views', () => {
  it('counts views of public videos only', async () => {
    const visible = await createVideo(pool, { uploaderId });
    const hidden = await createVideo(pool, { uploaderId, visibility: 'private' });

    await request(app).post(`/api/videos/${visible.id}/views`).expect(204);
    await request(app).post(`/api/videos/${visible.id}/views`).expect(204);
    const hiddenRes = await request(app).post(`/api/videos/${hidden.id}/views`);

    const detail = await request(app).get(`/api/videos/${visible.id}`);
    expect(detail.body.data.viewCount).toBe(2);
    expect(hiddenRes.status).toBe(404);
  });
});

describe('GET /api/tags', () => {
  it('lists tags with counts of watchable videos, most used first', async () => {
    const first = await createVideo(pool, { uploaderId });
    const second = await createVideo(pool, { uploaderId });
    const hidden = await createVideo(pool, { uploaderId, visibility: 'private' });
    await tagVideo(pool, first.id, ['react', 'css']);
    await tagVideo(pool, second.id, ['react']);
    await tagVideo(pool, hidden.id, ['css', 'secret']);

    const res = await request(app).get('/api/tags');

    expect(res.body.data).toEqual([
      { name: 'react', videoCount: 2 },
      { name: 'css', videoCount: 1 },
      { name: 'secret', videoCount: 0 },
    ]);
  });
});
