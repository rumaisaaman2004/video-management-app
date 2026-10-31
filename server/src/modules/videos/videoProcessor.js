import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { withTransaction } from '../../db/transaction.js';
import { extractThumbnail, probe, transcodeToMp4 } from '../../lib/ffmpeg.js';
import { logger } from '../../lib/logger.js';
import { planRenditions } from './renditions.js';
import { videoStorageKeys } from './storageKeys.js';
import { createVideoAssetsRepository } from './videoAssets.repository.js';
import { createVideosRepository } from './videos.repository.js';

const THUMBNAIL_WIDTH = 640;
// Grab the thumbnail early in the video, but past any fade-in.
const THUMBNAIL_POSITION = { fraction: 0.1, maxSeconds: 5 };

/**
 * Processes uploaded videos in the background: reads metadata, generates a
 * thumbnail and quality renditions, then marks the video ready (or failed).
 *
 * The queue lives in this process's memory. To process on separate worker
 * machines, replace enqueue() with a shared queue (e.g. BullMQ on Redis);
 * processVideo() itself can stay unchanged.
 */
export function createVideoProcessor({ pool, storage, concurrency }) {
  const videos = createVideosRepository(pool);
  const assets = createVideoAssetsRepository(pool);

  const queue = [];
  const queuedOrActive = new Set();
  let activeCount = 0;
  let idleWaiters = [];

  async function processVideo(videoId) {
    await mkdir(storage.tempDir, { recursive: true });
    const workDir = await mkdtemp(path.join(storage.tempDir, 'processing-'));

    try {
      const source = await assets.findSource(videoId);
      if (!source) throw new Error('Source file is missing');

      const sourcePath = await storage.toLocalPath(source.storageKey);
      const info = await probe(sourcePath);
      if (!info.video) throw new Error('File has no video stream');

      const generatedAssets = [];

      const thumbnailPath = path.join(workDir, 'thumbnail.jpg');
      await extractThumbnail(sourcePath, thumbnailPath, {
        atSeconds: Math.min(
          info.durationSeconds * THUMBNAIL_POSITION.fraction,
          THUMBNAIL_POSITION.maxSeconds,
        ),
        width: THUMBNAIL_WIDTH,
      });
      const thumbnailKey = videoStorageKeys.thumbnail(videoId);
      generatedAssets.push({
        kind: 'thumbnail',
        label: 'default',
        storageKey: thumbnailKey,
        mimeType: 'image/jpeg',
        sizeBytes: await storage.put(thumbnailKey, thumbnailPath),
      });

      for (const rendition of planRenditions(info.video)) {
        const outputPath = path.join(workDir, `${rendition.label}.mp4`);
        await transcodeToMp4(sourcePath, outputPath, { ...rendition, hasAudio: info.hasAudio });

        const storageKey = videoStorageKeys.rendition(videoId, rendition.label);
        generatedAssets.push({
          kind: 'rendition',
          label: rendition.label,
          storageKey,
          mimeType: 'video/mp4',
          sizeBytes: await storage.put(storageKey, outputPath),
          width: rendition.width,
          height: rendition.height,
        });
      }

      await withTransaction(pool, async (client) => {
        const clientAssets = createVideoAssetsRepository(client);
        await clientAssets.deleteGenerated(videoId);
        for (const asset of generatedAssets) {
          await clientAssets.create({ videoId, ...asset });
        }
        await createVideosRepository(client).markReady(videoId, {
          durationSeconds: Math.round(info.durationSeconds),
        });
      });
    } catch (err) {
      await Promise.all([
        storage.remove(videoStorageKeys.thumbnail(videoId)),
        storage.remove(videoStorageKeys.renditions(videoId)),
      ]);
      await videos.markFailed(videoId);
      throw err;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  function drain() {
    while (activeCount < concurrency && queue.length > 0) {
      const videoId = queue.shift();
      activeCount += 1;
      const startedAt = Date.now();

      processVideo(videoId)
        .then(() => logger.info({ videoId, ms: Date.now() - startedAt }, 'Video processed'))
        .catch((err) => logger.error({ err, videoId }, 'Video processing failed'))
        .finally(() => {
          activeCount -= 1;
          queuedOrActive.delete(videoId);
          drain();
        });
    }

    if (activeCount === 0 && queue.length === 0) {
      idleWaiters.forEach((resolve) => resolve());
      idleWaiters = [];
    }
  }

  function enqueue(videoId) {
    if (queuedOrActive.has(videoId)) return;
    queuedOrActive.add(videoId);
    queue.push(videoId);
    drain();
  }

  return {
    enqueue,

    /** Re-queues videos left in "processing" by a restart or crash. Returns how many. */
    async resumePending() {
      const videoIds = await videos.findIdsByStatus('processing');
      videoIds.forEach(enqueue);
      return videoIds.length;
    },

    /** Resolves once the queue is empty and no video is being processed. */
    whenIdle() {
      if (activeCount === 0 && queue.length === 0) return Promise.resolve();
      return new Promise((resolve) => idleWaiters.push(resolve));
    },
  };
}
