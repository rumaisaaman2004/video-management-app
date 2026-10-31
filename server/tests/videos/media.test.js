import { stat } from 'node:fs/promises';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createContainer } from '../../src/container.js';
import { pool } from '../../src/db/pool.js';
import { signPath } from '../../src/lib/signedUrls.js';
import { bearerToken } from '../helpers/auth.js';
import { truncateAllTables } from '../helpers/db.js';
import { createUser, createVideo } from '../helpers/fixtures.js';
import {
  createSampleFile,
  createSampleImage,
  createSampleVideo,
  probeDimensions,
} from '../helpers/media.js';

const container = createContainer({ pool });
const { storage, videoProcessor } = container;
const app = createApp(container);

let adminToken;
let videoId;

/** Uploads and fully processes one real video, shared by the tests in this file. */
beforeAll(async () => {
  const admin = await createUser(pool, { role: 'admin' });
  adminToken = bearerToken('admin', admin.id);
  const sample = await createSampleVideo({ name: 'media-sample', width: 640, height: 360 });

  const res = await request(app)
    .post('/api/videos')
    .set('Authorization', adminToken)
    .field('title', 'Media sample')
    .field('tags', 'react, Hooks, react')
    .attach('file', sample);
  videoId = res.body.data.id;
  await videoProcessor.whenIdle();
});

afterAll(() => truncateAllTables(pool));

function getDetail(token) {
  const req = request(app).get(`/api/videos/${videoId}`);
  return token ? req.set('Authorization', token) : req;
}

function setVisibility(visibility) {
  return request(app)
    .patch(`/api/videos/${videoId}`)
    .set('Authorization', adminToken)
    .send({ visibility });
}

describe('upload metadata', () => {
  it('stores comma-separated tags from the upload form', async () => {
    expect((await getDetail()).body.data.tags).toEqual(['hooks', 'react']);
  });
});

describe('streaming a public video', () => {
  it('lists playable renditions with plain URLs', async () => {
    const { renditions, thumbnailUrl } = (await getDetail()).body.data;

    expect(renditions).toEqual([
      { label: '360p', width: 640, height: 360, url: `/api/videos/${videoId}/renditions/360p` },
    ]);
    expect(thumbnailUrl).toMatch(new RegExp(`^/api/videos/${videoId}/thumbnail\\?v=\\d+$`));
  });

  it('serves the whole file with seeking support and caching', async () => {
    const res = await request(app).get(`/api/videos/${videoId}/renditions/360p`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['cache-control']).toBe('public, max-age=86400');
  });

  it('serves a byte range for seeking', async () => {
    const res = await request(app)
      .get(`/api/videos/${videoId}/renditions/360p`)
      .set('Range', 'bytes=0-99');

    expect(res.status).toBe(206);
    expect(res.headers['content-length']).toBe('100');
    expect(res.headers['content-range']).toMatch(/^bytes 0-99\/\d+$/);
  });

  it('serves the thumbnail as a JPEG', async () => {
    const res = await request(app).get(`/api/videos/${videoId}/thumbnail`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
  });

  it('responds 404 for a quality that does not exist', async () => {
    const res = await request(app).get(`/api/videos/${videoId}/renditions/1080p`);

    expect(res.status).toBe(404);
  });
});

describe('streaming a private video', () => {
  beforeAll(() => setVisibility('private'));
  afterAll(() => setVisibility('public'));

  const renditionPath = () => `/api/videos/${videoId}/renditions/360p`;

  it('gives admins signed, expiring URLs', async () => {
    const { renditions } = (await getDetail(adminToken)).body.data;

    expect(renditions[0].url).toMatch(/\?expires=\d+&signature=[\w-]+$/);
    const res = await request(app).get(renditions[0].url);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('refuses unsigned, tampered and expired URLs', async () => {
    const signed = signPath(renditionPath(), 60);
    const tampered = signed.replace(/signature=./, 'signature=X');
    const expired = signPath(renditionPath(), -1);

    for (const url of [renditionPath(), tampered, expired]) {
      expect((await request(app).get(url)).status).toBe(404);
    }
  });

  it('does not accept a signature made for a different file', async () => {
    const thumbnailSignature = signPath(`/api/videos/${videoId}/thumbnail`, 60).split('?')[1];

    const res = await request(app).get(`${renditionPath()}?${thumbnailSignature}`);

    expect(res.status).toBe(404);
  });
});

describe('managing the thumbnail', () => {
  it('replaces it with an uploaded image, re-encoded as a 640px JPEG', async () => {
    const before = (await getDetail()).body.data.thumbnailUrl;
    const image = await createSampleImage({ name: 'custom.png', width: 1280, height: 720 });

    const res = await request(app)
      .put(`/api/videos/${videoId}/thumbnail`)
      .set('Authorization', adminToken)
      .attach('file', image);

    expect(res.status).toBe(200);
    expect(res.body.data.thumbnailUrl).not.toBe(before);
    const stored = await storage.toLocalPath(`videos/${videoId}/thumbnail.jpg`);
    expect(await probeDimensions(stored)).toEqual({ codec: 'mjpeg', width: 640, height: 360 });
  });

  it('rejects a file that is not really an image', async () => {
    const fake = await createSampleFile('fake.png', 'not an image');

    const res = await request(app)
      .put(`/api/videos/${videoId}/thumbnail`)
      .set('Authorization', adminToken)
      .attach('file', fake);

    expect(res.status).toBe(400);
  });

  it('picks a frame from the video', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/thumbnail/frame`)
      .set('Authorization', adminToken)
      .send({ atSeconds: 0.5 });

    expect(res.status).toBe(200);
  });

  it('rejects a frame position past the end of the video', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/thumbnail/frame`)
      .set('Authorization', adminToken)
      .send({ atSeconds: 60 });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('body.atSeconds');
  });

  it('refuses to change the thumbnail while a video is still processing', async () => {
    const { rows } = await pool.query('SELECT uploader_id FROM videos WHERE id = $1', [videoId]);
    const processing = await createVideo(pool, {
      uploaderId: rows[0].uploader_id,
      status: 'processing',
    });

    const res = await request(app)
      .post(`/api/videos/${processing.id}/thumbnail/frame`)
      .set('Authorization', adminToken)
      .send({ atSeconds: 0 });

    expect(res.status).toBe(409);
  });
});

describe('deleting a video', () => {
  it('removes its files from storage', async () => {
    const folder = await storage.toLocalPath(`videos/${videoId}`);
    await stat(folder);

    await request(app)
      .delete(`/api/videos/${videoId}`)
      .set('Authorization', adminToken)
      .expect(204);

    await expect(stat(folder)).rejects.toThrow();
  });
});
