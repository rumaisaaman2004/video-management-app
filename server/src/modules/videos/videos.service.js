import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../errors/AppError.js';
import { isForeignKeyViolation } from '../../errors/databaseErrors.js';
import { videoStorageKeys } from './storageKeys.js';
import { createVideoAssetsRepository } from './videoAssets.repository.js';
import { detectVideoFileType, SUPPORTED_VIDEO_FORMATS_LABEL } from './videoFileTypes.js';
import { createVideosRepository } from './videos.repository.js';

export function createVideosService({ pool, storage, videoProcessor }) {
  /**
   * Saves an uploaded file as a new video in "processing" status and queues it
   * for background processing. Returns the new video immediately.
   */
  async function upload({ uploaderId, file, metadata }) {
    if (!file) {
      throw AppError.validation([{ field: 'body.file', message: 'A video file is required' }]);
    }

    const fileType = await detectVideoFileType(file.path);
    if (!fileType) {
      throw AppError.validation([
        { field: 'body.file', message: `File must be ${SUPPORTED_VIDEO_FORMATS_LABEL}` },
      ]);
    }

    let videoId;
    try {
      const video = await withTransaction(pool, async (client) => {
        const created = await createVideosRepository(client).create({ uploaderId, ...metadata });
        videoId = created.id;

        const storageKey = videoStorageKeys.source(created.id, fileType.extension);
        const sizeBytes = await storage.put(storageKey, file.path);
        await createVideoAssetsRepository(client).create({
          videoId: created.id,
          kind: 'source',
          label: 'original',
          storageKey,
          mimeType: fileType.mimeType,
          sizeBytes,
        });

        return created;
      });

      videoProcessor.enqueue(video.id);
      return video;
    } catch (err) {
      // The database changes were rolled back; remove any file already moved into storage.
      if (videoId) await storage.remove(videoStorageKeys.root(videoId));

      if (isForeignKeyViolation(err) && err.constraint === 'videos_category_id_fkey') {
        throw AppError.validation([
          { field: 'body.categoryId', message: 'Category does not exist' },
        ]);
      }
      throw err;
    }
  }

  return { upload };
}
