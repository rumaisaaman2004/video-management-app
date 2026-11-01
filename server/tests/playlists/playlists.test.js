import { randomUUID } from 'node:crypto';
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
let videos;

beforeEach(async () => {
  ({ id: uploaderId } = await createUser(pool, { role: 'admin' }));
  ana = bearerToken('user', (await createUser(pool, { name: 'Ana' })).id);
  ben = bearerToken('user', (await createUser(pool, { name: 'Ben' })).id);
  videos = [];
  for (const title of ['Intro', 'Basics', 'Advanced']) {
    videos.push(await createVideo(pool, { uploaderId, title }));
  }
});

afterEach(() => truncateAllTables(pool));

function as(token) {
  const withAuth = (req) => (token ? req.set('Authorization', token) : req);
  return {
    get: (path) => withAuth(request(app).get(path)),
    post: (path, body) => withAuth(request(app).post(path)).send(body),
    patch: (path, body) => withAuth(request(app).patch(path)).send(body),
    put: (path, body) => withAuth(request(app).put(path)).send(body),
    delete: (path) => withAuth(request(app).delete(path)),
  };
}

async function createPlaylist(token = ana, body = { title: 'My course' }) {
  const res = await as(token).post('/api/playlists', body);
  return res.body.data;
}

async function addVideos(playlistId, videoList, token = ana) {
  let res;
  for (const video of videoList) {
    res = await as(token).post(`/api/playlists/${playlistId}/videos`, { videoId: video.id });
  }
  return res;
}

const titlesOf = (playlist) => playlist.videos.map((video) => video.title);

describe('creating and listing playlists', () => {
  it('creates a private playlist by default', async () => {
    const res = await as(ana).post('/api/playlists', { title: '  My course  ' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'My course',
      visibility: 'private',
      owner: { name: 'Ana' },
      videoCount: 0,
      coverThumbnailUrl: null,
      videos: [],
    });
  });

  it('lists only my own playlists', async () => {
    await createPlaylist(ana, { title: 'Ana list' });
    await createPlaylist(ben, { title: 'Ben list' });

    const res = await as(ana).get('/api/me/playlists');

    expect(res.body.data.map((playlist) => playlist.title)).toEqual(['Ana list']);
  });

  it('validates input and requires sign-in', async () => {
    expect((await as(ana).post('/api/playlists', { title: '' })).status).toBe(400);
    expect((await as(null).post('/api/playlists', { title: 'x' })).status).toBe(401);
  });
});

describe('managing videos in a playlist', () => {
  it('appends videos in order and counts them', async () => {
    const playlist = await createPlaylist();

    const res = await addVideos(playlist.id, videos);

    expect(titlesOf(res.body.data)).toEqual(['Intro', 'Basics', 'Advanced']);
    expect(res.body.data.videoCount).toBe(3);
  });

  it('rejects adding the same video twice', async () => {
    const playlist = await createPlaylist();
    await addVideos(playlist.id, [videos[0]]);

    const res = await addVideos(playlist.id, [videos[0]]);

    expect(res.status).toBe(409);
  });

  it('rejects videos the user cannot watch', async () => {
    const playlist = await createPlaylist();
    const hidden = await createVideo(pool, { uploaderId, visibility: 'private' });

    expect((await addVideos(playlist.id, [hidden])).status).toBe(404);
  });

  it('removes a video and closes the gap', async () => {
    const playlist = await createPlaylist();
    await addVideos(playlist.id, videos);

    const res = await as(ana).delete(`/api/playlists/${playlist.id}/videos/${videos[1].id}`);
    const appended = await addVideos(playlist.id, [videos[1]]);

    expect(titlesOf(res.body.data)).toEqual(['Intro', 'Advanced']);
    expect(titlesOf(appended.body.data)).toEqual(['Intro', 'Advanced', 'Basics']);
  });

  it('reorders videos', async () => {
    const playlist = await createPlaylist();
    await addVideos(playlist.id, videos);

    const res = await as(ana).put(`/api/playlists/${playlist.id}/videos/order`, {
      videoIds: [videos[2].id, videos[0].id, videos[1].id],
    });

    expect(res.status).toBe(200);
    expect(titlesOf(res.body.data)).toEqual(['Advanced', 'Intro', 'Basics']);
  });

  it('rejects a reorder that does not list every video exactly once', async () => {
    const playlist = await createPlaylist();
    await addVideos(playlist.id, videos);

    for (const videoIds of [
      [videos[0].id, videos[1].id],
      [videos[0].id, videos[0].id, videos[1].id],
      [videos[0].id, videos[1].id, randomUUID()],
    ]) {
      const res = await as(ana).put(`/api/playlists/${playlist.id}/videos/order`, { videoIds });
      expect(res.status).toBe(400);
    }
  });

  it('keeps videos that became hidden at the end when reordering', async () => {
    const playlist = await createPlaylist();
    await addVideos(playlist.id, videos);
    await pool.query("UPDATE videos SET visibility = 'private' WHERE id = $1", [videos[0].id]);

    const res = await as(ana).put(`/api/playlists/${playlist.id}/videos/order`, {
      videoIds: [videos[2].id, videos[1].id],
    });

    expect(titlesOf(res.body.data)).toEqual(['Advanced', 'Basics']);
    const { rows } = await pool.query(
      'SELECT video_id FROM playlist_videos WHERE playlist_id = $1 ORDER BY position',
      [playlist.id],
    );
    expect(rows.map((row) => row.video_id)).toEqual([videos[2].id, videos[1].id, videos[0].id]);
  });

  it('handles simultaneous adds without corrupting positions', async () => {
    const playlist = await createPlaylist();

    const results = await Promise.all(
      videos.map((video) =>
        as(ana).post(`/api/playlists/${playlist.id}/videos`, { videoId: video.id }),
      ),
    );

    expect(results.map((res) => res.status)).toEqual([200, 200, 200]);
    const { rows } = await pool.query(
      'SELECT position FROM playlist_videos WHERE playlist_id = $1 ORDER BY position',
      [playlist.id],
    );
    expect(rows.map((row) => row.position)).toEqual([0, 1, 2]);
  });
});

describe('access control', () => {
  it('hides private playlists from other users with 404', async () => {
    const playlist = await createPlaylist();

    expect((await as(ben).get(`/api/playlists/${playlist.id}`)).status).toBe(404);
    expect((await as(null).get(`/api/playlists/${playlist.id}`)).status).toBe(404);
    expect((await as(ana).get(`/api/playlists/${playlist.id}`)).status).toBe(200);
  });

  it('lets anyone view a public playlist, but only the owner change it', async () => {
    const playlist = await createPlaylist(ana, { title: 'Shared', visibility: 'public' });
    await addVideos(playlist.id, [videos[0]]);

    const anonymous = await as(null).get(`/api/playlists/${playlist.id}`);
    const benEdit = await as(ben).patch(`/api/playlists/${playlist.id}`, { title: 'Mine now' });
    const benAdd = await addVideos(playlist.id, [videos[1]], ben);
    const benDelete = await as(ben).delete(`/api/playlists/${playlist.id}`);

    expect(anonymous.status).toBe(200);
    expect(anonymous.body.data.coverThumbnailUrl).toBeNull();
    expect([benEdit.status, benAdd.status, benDelete.status]).toEqual([403, 403, 403]);
  });

  it('lets the owner rename, change visibility and delete', async () => {
    const playlist = await createPlaylist();

    const updated = await as(ana).patch(`/api/playlists/${playlist.id}`, {
      title: 'Renamed',
      visibility: 'public',
    });
    const deleted = await as(ana).delete(`/api/playlists/${playlist.id}`);

    expect(updated.body.data).toMatchObject({ title: 'Renamed', visibility: 'public' });
    expect(deleted.status).toBe(204);
    expect((await as(ana).get(`/api/playlists/${playlist.id}`)).status).toBe(404);
  });
});
