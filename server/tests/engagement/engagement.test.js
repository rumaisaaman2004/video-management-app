import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createContainer } from '../../src/container.js';
import { pool } from '../../src/db/pool.js';
import { bearerToken } from '../helpers/auth.js';
import { truncateAllTables } from '../helpers/db.js';
import { createUser, createVideo } from '../helpers/fixtures.js';

const app = createApp(createContainer({ pool }));

let uploaderId;
let ana;
let ben;

beforeEach(async () => {
  ({ id: uploaderId } = await createUser(pool, { role: 'admin' }));
  const anaUser = await createUser(pool, { name: 'Ana' });
  const benUser = await createUser(pool, { name: 'Ben' });
  ana = bearerToken('user', anaUser.id);
  ben = bearerToken('user', benUser.id);
});

afterEach(() => truncateAllTables(pool));

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function as(token) {
  return {
    put: (path, body) => request(app).put(path).set('Authorization', token).send(body),
    delete: (path) => request(app).delete(path).set('Authorization', token),
    get: (path, query = {}) => request(app).get(path).query(query).set('Authorization', token),
  };
}

describe('likes', () => {
  it('likes and unlikes, returning the live count, and is safe to repeat', async () => {
    const video = await createVideo(pool, { uploaderId });

    await as(ben).put(`/api/videos/${video.id}/like`);
    const liked = await as(ana).put(`/api/videos/${video.id}/like`);
    const repeated = await as(ana).put(`/api/videos/${video.id}/like`);
    const unliked = await as(ana).delete(`/api/videos/${video.id}/like`);

    expect(liked.body.data).toEqual({ liked: true, likeCount: 2 });
    expect(repeated.body.data).toEqual({ liked: true, likeCount: 2 });
    expect(unliked.body.data).toEqual({ liked: false, likeCount: 1 });
  });

  it('requires sign-in and a watchable video', async () => {
    const hidden = await createVideo(pool, { uploaderId, visibility: 'private' });

    expect((await request(app).put(`/api/videos/${hidden.id}/like`)).status).toBe(401);
    expect((await as(ana).put(`/api/videos/${hidden.id}/like`)).status).toBe(404);
  });
});

describe('viewer state on video responses', () => {
  it('adds likeCount for everyone and personal state for signed-in viewers', async () => {
    const video = await createVideo(pool, { uploaderId });
    await as(ana).put(`/api/videos/${video.id}/like`);
    await as(ana).put(`/api/videos/${video.id}/bookmark`);
    await as(ana).put(`/api/videos/${video.id}/progress`, { positionSeconds: 40 });

    const anonymous = await request(app).get(`/api/videos/${video.id}`);
    const forAna = await as(ana).get(`/api/videos/${video.id}`);
    const forBen = await as(ben).get('/api/videos');

    expect(anonymous.body.data.likeCount).toBe(1);
    expect(anonymous.body.data.viewer).toBeUndefined();
    expect(forAna.body.data.viewer).toEqual({
      liked: true,
      bookmarked: true,
      progressSeconds: 40,
      completed: false,
    });
    expect(forBen.body.data[0].viewer).toEqual({
      liked: false,
      bookmarked: false,
      progressSeconds: 0,
      completed: false,
    });
  });
});

describe('bookmarks', () => {
  it('lists saved videos newest first and hides ones that became private', async () => {
    const first = await createVideo(pool, { uploaderId, title: 'First' });
    const second = await createVideo(pool, { uploaderId, title: 'Second' });
    const later = await createVideo(pool, { uploaderId, title: 'Made private later' });
    for (const video of [first, second, later]) {
      await as(ana).put(`/api/videos/${video.id}/bookmark`);
    }
    await pool.query("UPDATE videos SET visibility = 'private' WHERE id = $1", [later.id]);

    const res = await as(ana).get('/api/me/bookmarks');

    expect(res.body.data.map((video) => video.title)).toEqual(['Second', 'First']);
    expect(res.body.meta.total).toBe(2);
  });

  it('removes a bookmark', async () => {
    const video = await createVideo(pool, { uploaderId });
    await as(ana).put(`/api/videos/${video.id}/bookmark`);

    const res = await as(ana).delete(`/api/videos/${video.id}/bookmark`);

    expect(res.body.data).toEqual({ bookmarked: false });
    expect((await as(ana).get('/api/me/bookmarks')).body.data).toEqual([]);
  });

  it('keeps each user’s bookmarks private', async () => {
    const video = await createVideo(pool, { uploaderId });
    await as(ana).put(`/api/videos/${video.id}/bookmark`);

    expect((await as(ben).get('/api/me/bookmarks')).body.data).toEqual([]);
  });
});

describe('watch progress and history', () => {
  it('saves progress, clamped to the video length', async () => {
    const video = await createVideo(pool, { uploaderId, durationSeconds: 100 });

    const res = await as(ana).put(`/api/videos/${video.id}/progress`, { positionSeconds: 500 });

    expect(res.body.data).toEqual({ progressSeconds: 100, completed: true });
  });

  it('marks a video completed at 95% and keeps it completed on rewatch', async () => {
    const video = await createVideo(pool, { uploaderId, durationSeconds: 100 });

    const nearEnd = await as(ana).put(`/api/videos/${video.id}/progress`, {
      positionSeconds: 95.4,
    });
    const rewatch = await as(ana).put(`/api/videos/${video.id}/progress`, {
      positionSeconds: 3,
    });

    expect(nearEnd.body.data).toEqual({ progressSeconds: 95, completed: true });
    expect(rewatch.body.data).toEqual({ progressSeconds: 3, completed: true });
  });

  it('validates the position', async () => {
    const video = await createVideo(pool, { uploaderId });

    const res = await as(ana).put(`/api/videos/${video.id}/progress`, { positionSeconds: -1 });

    expect(res.status).toBe(400);
  });

  it('lists history by last watched, with a continue-watching filter', async () => {
    const finished = await createVideo(pool, { uploaderId, title: 'Finished' });
    const started = await createVideo(pool, { uploaderId, title: 'Started' });
    await as(ana).put(`/api/videos/${started.id}/progress`, { positionSeconds: 30 });
    await as(ana).put(`/api/videos/${finished.id}/progress`, { positionSeconds: 100 });

    const history = await as(ana).get('/api/me/history');
    const continueWatching = await as(ana).get('/api/me/history', { inProgress: 'true' });

    expect(history.body.data.map((video) => video.title)).toEqual(['Finished', 'Started']);
    expect(continueWatching.body.data.map((video) => video.title)).toEqual(['Started']);
    expect(continueWatching.body.data[0].viewer.progressSeconds).toBe(30);
  });

  it('orders history by when a video was last watched', async () => {
    const older = await createVideo(pool, { uploaderId, title: 'Older' });
    const newer = await createVideo(pool, { uploaderId, title: 'Newer' });
    await as(ana).put(`/api/videos/${older.id}/progress`, { positionSeconds: 10 });
    await as(ana).put(`/api/videos/${newer.id}/progress`, { positionSeconds: 10 });
    await pool.query('UPDATE watch_history SET last_watched_at = $1 WHERE video_id = $2', [
      daysAgo(1),
      older.id,
    ]);

    const res = await as(ana).get('/api/me/history');

    expect(res.body.data.map((video) => video.title)).toEqual(['Newer', 'Older']);
  });

  it('removes one entry or clears all history', async () => {
    const first = await createVideo(pool, { uploaderId });
    const second = await createVideo(pool, { uploaderId });
    await as(ana).put(`/api/videos/${first.id}/progress`, { positionSeconds: 10 });
    await as(ana).put(`/api/videos/${second.id}/progress`, { positionSeconds: 10 });

    const removed = await as(ana).delete(`/api/me/history/${first.id}`);
    const removedAgain = await as(ana).delete(`/api/me/history/${first.id}`);
    expect(removed.status).toBe(204);
    expect(removedAgain.status).toBe(404);
    expect((await as(ana).get('/api/me/history')).body.meta.total).toBe(1);

    await as(ana).delete('/api/me/history').expect(204);
    expect((await as(ana).get('/api/me/history')).body.meta.total).toBe(0);
  });

  it('requires sign-in for personal lists', async () => {
    expect((await request(app).get('/api/me/history')).status).toBe(401);
    expect((await request(app).get('/api/me/bookmarks')).status).toBe(401);
  });
});
