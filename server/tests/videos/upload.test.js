import { copyFile, readdir, readFile, stat } from 'node:fs/promises';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createContainer } from '../../src/container.js';
import { pool } from '../../src/db/pool.js';
import { bearerToken } from '../helpers/auth.js';
import { truncateAllTables } from '../helpers/db.js';
import { createCategory, createUser, createVideo } from '../helpers/fixtures.js';
import { createSampleFile, createSampleVideo } from '../helpers/media.js';

const container = createContainer({ pool });
const { storage, videoProcessor } = container;
const app = createApp(container);

let samples;
let adminToken;

beforeAll(async () => {
  samples = {
    landscape: await createSampleVideo({ name: 'landscape', width: 640, height: 360 }),
    portrait: await createSampleVideo({ name: 'portrait', width: 360, height: 640 }),
    tinySilent: await createSampleVideo({
      name: 'tiny-silent',
      width: 160,
      height: 120,
      withAudio: false,
    }),
    fakeVideo: await createSampleFile('fake.mp4', 'this is plain text, not a video'),
    tooLarge: await createSampleFile('too-large.mp4', Buffer.alloc(3 * 1024 * 1024)),
  };
  // A real MP4 cut short: it still starts like an MP4 but cannot be decoded.
  const landscapeBytes = await readFile(samples.landscape);
  samples.truncated = await createSampleFile('truncated.mp4', landscapeBytes.subarray(0, 2048));
});

beforeEach(async () => {
  // Uploads reference the uploader row, so the admin must exist in the database.
  const admin = await createUser(pool, { role: 'admin' });
  adminToken = bearerToken('admin', admin.id);
});

afterEach(() => truncateAllTables(pool));

function upload(filePath, fields = { title: 'Intro to Hooks' }, token = adminToken) {
  const req = request(app).post('/api/videos');
  if (token) req.set('Authorization', token);
  for (const [name, value] of Object.entries(fields)) req.field(name, value);
  return filePath ? req.attach('file', filePath) : req;
}

async function getVideo(id) {
  const { rows } = await pool.query(
    'SELECT status, duration_seconds AS "durationSeconds" FROM videos WHERE id = $1',
    [id],
  );
  return rows[0];
}

async function getAssets(videoId) {
  const { rows } = await pool.query(
    `SELECT kind, label, storage_key AS "storageKey", width, height, size_bytes AS "sizeBytes"
     FROM video_assets WHERE video_id = $1 ORDER BY kind, height`,
    [videoId],
  );
  return rows;
}

async function storedFileExists(key) {
  try {
    await stat(await storage.toLocalPath(key));
    return true;
  } catch {
    return false;
  }
}

async function leftoverTempFiles() {
  try {
    return await readdir(storage.tempDir);
  } catch {
    return [];
  }
}

async function countVideos() {
  const { rows } = await pool.query('SELECT count(*) FROM videos');
  return Number(rows[0].count);
}

describe('POST /api/videos', () => {
  describe('successful uploads', () => {
    it('accepts the upload, then processes it into a thumbnail and renditions', async () => {
      const res = await upload(samples.landscape, {
        title: '  Intro to Hooks  ',
        description: 'useState explained',
      });

      expect(res.status).toBe(202);
      expect(res.body.data).toMatchObject({
        title: 'Intro to Hooks',
        description: 'useState explained',
        visibility: 'public',
        status: 'processing',
      });

      await videoProcessor.whenIdle();
      const videoId = res.body.data.id;

      expect(await getVideo(videoId)).toEqual({ status: 'ready', durationSeconds: 1 });
      const assets = await getAssets(videoId);
      expect(
        assets.map(({ kind, label, width, height }) => ({ kind, label, width, height })),
      ).toEqual([
        { kind: 'rendition', label: '360p', width: 640, height: 360 },
        { kind: 'source', label: 'original', width: null, height: null },
        { kind: 'thumbnail', label: 'default', width: null, height: null },
      ]);
      for (const asset of assets) {
        expect(asset.sizeBytes).toBeGreaterThan(0);
        expect(await storedFileExists(asset.storageKey)).toBe(true);
      }
      expect(await leftoverTempFiles()).toEqual([]);
    });

    it('labels portrait renditions by their short side', async () => {
      const res = await upload(samples.portrait);
      await videoProcessor.whenIdle();

      const rendition = (await getAssets(res.body.data.id)).find((a) => a.kind === 'rendition');
      expect(rendition).toMatchObject({ label: '360p', width: 360, height: 640 });
    });

    it('handles small videos without audio without upscaling them', async () => {
      const res = await upload(samples.tinySilent);
      await videoProcessor.whenIdle();

      const renditions = (await getAssets(res.body.data.id)).filter((a) => a.kind === 'rendition');
      expect(await getVideo(res.body.data.id)).toMatchObject({ status: 'ready' });
      expect(renditions).toEqual([
        expect.objectContaining({ label: '120p', width: 160, height: 120 }),
      ]);
    });

    it('links the video to an existing category', async () => {
      const category = await createCategory(pool);

      const res = await upload(samples.landscape, { title: 'Hooks', categoryId: category.id });
      await videoProcessor.whenIdle();

      expect(res.status).toBe(202);
      expect(res.body.data.category).toEqual({
        id: category.id,
        name: category.name,
        slug: category.slug,
      });
    });
  });

  describe('rejected files', () => {
    it('rejects a file whose content is not a video, whatever its name', async () => {
      const res = await upload(samples.fakeVideo);

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('body.file');
      expect(await countVideos()).toBe(0);
      expect(await leftoverTempFiles()).toEqual([]);
    });

    it('rejects an unsupported declared file type before saving it', async () => {
      const textFile = await createSampleFile('notes.txt', 'hello');

      const res = await upload(textFile);

      expect(res.status).toBe(400);
      expect(await leftoverTempFiles()).toEqual([]);
    });

    it('responds 413 for files over the size limit', async () => {
      const res = await upload(samples.tooLarge);

      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(await leftoverTempFiles()).toEqual([]);
    });

    it('marks an undecodable video as failed and keeps only the source', async () => {
      const res = await upload(samples.truncated);
      await videoProcessor.whenIdle();
      const videoId = res.body.data.id;

      expect(res.status).toBe(202);
      expect((await getVideo(videoId)).status).toBe('failed');
      expect((await getAssets(videoId)).map((asset) => asset.kind)).toEqual(['source']);
      expect(await storedFileExists(`videos/${videoId}/thumbnail.jpg`)).toBe(false);
    });
  });

  describe('validation', () => {
    it('requires a file', async () => {
      const res = await upload(null);

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('body.file');
    });

    it('requires a title and removes the uploaded temp file', async () => {
      const res = await upload(samples.landscape, { title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('body.title');
      expect(await leftoverTempFiles()).toEqual([]);
    });

    it('rejects an unknown category and stores nothing', async () => {
      const res = await upload(samples.landscape, {
        title: 'Hooks',
        categoryId: '7f1d6a52-3b8e-4c1a-9d2f-5e6b7c8d9e0f',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.details[0]).toEqual({
        field: 'body.categoryId',
        message: 'Category does not exist',
      });
      expect(await countVideos()).toBe(0);
      expect(await leftoverTempFiles()).toEqual([]);
    });
  });

  describe('access control', () => {
    // The server answers before reading the upload and closes the connection. A tiny file
    // is fully sent before that, so the client never fails mid-write (EPIPE); the contents
    // do not matter because access is refused first.
    it('rejects anonymous visitors before reading the file', async () => {
      const res = await upload(samples.fakeVideo, { title: 'Hooks' }, null);

      expect(res.status).toBe(401);
      expect(await leftoverTempFiles()).toEqual([]);
    });

    it('rejects non-admin users before reading the file', async () => {
      const res = await upload(samples.fakeVideo, { title: 'Hooks' }, bearerToken('user'));

      expect(res.status).toBe(403);
      expect(await leftoverTempFiles()).toEqual([]);
    });
  });
});

describe('videoProcessor.resumePending', () => {
  afterEach(() => truncateAllTables(pool));

  it('finishes videos left in "processing" by a restart', async () => {
    const uploader = await createUser(pool, { role: 'admin' });
    const video = await createVideo(pool, { uploaderId: uploader.id, status: 'processing' });
    const sourceKey = `videos/${video.id}/source.mp4`;
    const copyPath = await createSampleFile('resume-copy.mp4', '');
    await copyFile(samples.landscape, copyPath);
    const sizeBytes = await storage.put(sourceKey, copyPath);
    await pool.query(
      `INSERT INTO video_assets (video_id, kind, label, storage_key, mime_type, size_bytes)
       VALUES ($1, 'source', 'original', $2, 'video/mp4', $3)`,
      [video.id, sourceKey, sizeBytes],
    );

    const resumed = await videoProcessor.resumePending();
    await videoProcessor.whenIdle();

    expect(resumed).toBe(1);
    expect((await getVideo(video.id)).status).toBe('ready');
  });
});
