import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../errors/AppError.js';
import { isForeignKeyViolation } from '../../errors/databaseErrors.js';
import { paginationMeta } from '../../lib/commonSchemas.js';
import { extractThumbnail } from '../../lib/ffmpeg.js';
import { createTagsRepository } from '../tags/tags.repository.js';
import {
  detectImageFileType,
  detectVideoFileType,
  SUPPORTED_IMAGE_FORMATS_LABEL,
  SUPPORTED_VIDEO_FORMATS_LABEL,
} from './mediaFileTypes.js';
import { buildSearch } from './search.js';
import { videoStorageKeys } from './storageKeys.js';
import { THUMBNAIL_WIDTH } from './thumbnails.js';
import { createVideoAssetsRepository } from './videoAssets.repository.js';
import { isPubliclyWatchable, presentVideo } from './videos.presenter.js';
import { createVideosRepository } from './videos.repository.js';

const ADMIN_VIEWER = { role: 'admin' };

function isAdmin(viewer) {
  return viewer?.role === 'admin';
}

function fileError(message) {
  return AppError.validation([{ field: 'body.file', message }]);
}

/** Reports a missing category as a field error instead of a generic database error. */
function rethrowAsCategoryError(err) {
  if (isForeignKeyViolation(err) && err.constraint === 'videos_category_id_fkey') {
    throw AppError.validation([{ field: 'body.categoryId', message: 'Category does not exist' }]);
  }
  throw err;
}

export function createVideosService({ pool, storage, videoProcessor }) {
  const videos = createVideosRepository(pool);
  const assets = createVideoAssetsRepository(pool);

  /** Loads a video the viewer may see. Hidden videos get 404 so their existence is not revealed. */
  async function findViewable(id, viewer) {
    const video = await videos.findById(id);
    if (!video || !(isAdmin(viewer) || isPubliclyWatchable(video))) {
      throw AppError.notFound('Video not found');
    }
    return video;
  }

  async function getById(id, viewer) {
    const video = await findViewable(id, viewer);
    return presentVideo(video, await assets.findRenditions(id));
  }

  async function findReady(id) {
    const video = await videos.findById(id);
    if (!video) throw AppError.notFound('Video not found');
    if (video.status !== 'ready') {
      throw AppError.conflict(
        'The thumbnail can be changed once the video has finished processing',
      );
    }
    return video;
  }

  /** Renders a new thumbnail with `render(outputPath)` and makes it the video's thumbnail. */
  async function saveThumbnail(videoId, render) {
    await mkdir(storage.tempDir, { recursive: true });
    const workDir = await mkdtemp(path.join(storage.tempDir, 'thumbnail-'));

    try {
      const outputPath = path.join(workDir, 'thumbnail.jpg');
      await render(outputPath);

      const storageKey = videoStorageKeys.thumbnail(videoId);
      const sizeBytes = await storage.put(storageKey, outputPath);

      await withTransaction(pool, async (client) => {
        const clientAssets = createVideoAssetsRepository(client);
        await clientAssets.deleteByKind(videoId, 'thumbnail');
        await clientAssets.create({
          videoId,
          kind: 'thumbnail',
          label: 'default',
          storageKey,
          mimeType: 'image/jpeg',
          sizeBytes,
        });
      });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }

    return getById(videoId, ADMIN_VIEWER);
  }

  return {
    getById,

    /** One page of the library. Non-admins only ever see ready, public videos. */
    async list(query, viewer) {
      const search = buildSearch(query.q);
      const filters = {
        status: isAdmin(viewer) ? query.status : 'ready',
        visibility: isAdmin(viewer) ? query.visibility : 'public',
        categorySlug: query.category,
        tag: query.tag,
        search,
      };
      const requestedSort = query.sort ?? 'relevance';
      const sort = requestedSort === 'relevance' && !search ? 'newest' : requestedSort;

      const { videos: page, total } = await videos.findPage({
        filters,
        sort,
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      });

      return {
        data: page.map((video) => presentVideo(video)),
        meta: paginationMeta(query, total),
      };
    },

    /**
     * Saves an uploaded file as a new video in "processing" status and queues it
     * for background processing. Returns the new video immediately.
     */
    async upload({ uploaderId, file, metadata }) {
      if (!file) throw fileError('A video file is required');

      const fileType = await detectVideoFileType(file.path);
      if (!fileType) throw fileError(`File must be ${SUPPORTED_VIDEO_FORMATS_LABEL}`);

      const { tags, ...fields } = metadata;
      let videoId;
      try {
        await withTransaction(pool, async (client) => {
          videoId = await createVideosRepository(client).create({ uploaderId, ...fields });
          if (tags?.length) await createTagsRepository(client).replaceVideoTags(videoId, tags);

          const storageKey = videoStorageKeys.source(videoId, fileType.extension);
          const sizeBytes = await storage.put(storageKey, file.path);
          await createVideoAssetsRepository(client).create({
            videoId,
            kind: 'source',
            label: 'original',
            storageKey,
            mimeType: fileType.mimeType,
            sizeBytes,
          });
        });
      } catch (err) {
        // The database changes were rolled back; remove any file already moved into storage.
        if (videoId) await storage.remove(videoStorageKeys.root(videoId));
        rethrowAsCategoryError(err);
      }

      videoProcessor.enqueue(videoId);
      return getById(videoId, ADMIN_VIEWER);
    },

    async update(id, changes) {
      const { tags, ...fields } = changes;

      await withTransaction(pool, async (client) => {
        const found = await createVideosRepository(client).update(id, fields);
        if (!found) throw AppError.notFound('Video not found');
        if (tags) await createTagsRepository(client).replaceVideoTags(id, tags);
      }).catch(rethrowAsCategoryError);

      return getById(id, ADMIN_VIEWER);
    },

    async delete(id) {
      const deleted = await videos.delete(id);
      if (!deleted) throw AppError.notFound('Video not found');
      await storage.remove(videoStorageKeys.root(id));
    },

    async recordView(id) {
      const counted = await videos.incrementViewCount(id);
      if (!counted) throw AppError.notFound('Video not found');
    },

    /** Uses an uploaded image as the thumbnail, re-encoded so only clean JPEG pixels are kept. */
    async replaceThumbnail(id, file) {
      if (!file) throw fileError('An image file is required');
      if (!(await detectImageFileType(file.path))) {
        throw fileError(`Image must be ${SUPPORTED_IMAGE_FORMATS_LABEL}`);
      }
      await findReady(id);

      try {
        return await saveThumbnail(id, (outputPath) =>
          extractThumbnail(file.path, outputPath, { atSeconds: 0, width: THUMBNAIL_WIDTH }),
        );
      } finally {
        await rm(file.path, { force: true });
      }
    },

    /** Uses the frame at `atSeconds` as the thumbnail. */
    async captureThumbnailFrame(id, atSeconds) {
      const video = await findReady(id);
      if (atSeconds >= video.durationSeconds) {
        throw AppError.validation([
          {
            field: 'body.atSeconds',
            message: `Must be less than the video length (${video.durationSeconds} seconds)`,
          },
        ]);
      }

      const source = await assets.findSource(id);
      const sourcePath = await storage.toLocalPath(source.storageKey);
      return saveThumbnail(id, (outputPath) =>
        extractThumbnail(sourcePath, outputPath, { atSeconds, width: THUMBNAIL_WIDTH }),
      );
    },

    /**
     * Resolves a stored media file the request may access: public videos for
     * everyone; others only for admins or with a valid signed URL.
     */
    async getMediaFile({ videoId, kind, label, viewer, hasValidSignature }) {
      const video = await videos.findById(videoId);
      const canAccess =
        video && (isPubliclyWatchable(video) || isAdmin(viewer) || hasValidSignature);
      if (!canAccess) throw AppError.notFound('Video not found');

      const asset = await assets.findOne(videoId, kind, label);
      if (!asset) throw AppError.notFound('File not found');

      return {
        filePath: await storage.toLocalPath(asset.storageKey),
        isPublic: isPubliclyWatchable(video),
      };
    },
  };
}
