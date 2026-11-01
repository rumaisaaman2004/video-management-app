import { Router } from 'express';
import { env } from '../../config/env.js';
import { idParamsSchema } from '../../lib/commonSchemas.js';
import { createFileUpload, removeUploadedFileOnError } from '../../middleware/fileUpload.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize, optionalAuthenticate } from '../auth/auth.middleware.js';
import {
  SUPPORTED_IMAGE_FORMATS_LABEL,
  SUPPORTED_IMAGE_MIME_TYPES,
  SUPPORTED_VIDEO_FORMATS_LABEL,
  SUPPORTED_VIDEO_MIME_TYPES,
} from './mediaFileTypes.js';
import { createVideosController } from './videos.controller.js';
import {
  listVideosQuerySchema,
  renditionParamsSchema,
  thumbnailFrameSchema,
  updateVideoSchema,
  uploadVideoSchema,
} from './videos.schemas.js';

const MAX_THUMBNAIL_SIZE_MB = 5;

export function createVideosRouter({ videosService, storage }) {
  const router = Router();
  const controller = createVideosController({ videosService });
  const adminOnly = [authenticate, authorize('admin')];
  const withId = validate({ params: idParamsSchema });

  const videoUpload = createFileUpload({
    fieldName: 'file',
    tempDir: storage.tempDir,
    maxSizeMb: env.MAX_UPLOAD_SIZE_MB,
    allowedMimeTypes: SUPPORTED_VIDEO_MIME_TYPES,
    typeLabel: SUPPORTED_VIDEO_FORMATS_LABEL,
  });
  const thumbnailUpload = createFileUpload({
    fieldName: 'file',
    tempDir: storage.tempDir,
    maxSizeMb: MAX_THUMBNAIL_SIZE_MB,
    allowedMimeTypes: SUPPORTED_IMAGE_MIME_TYPES,
    typeLabel: SUPPORTED_IMAGE_FORMATS_LABEL,
  });
  // Stops scripts from inflating view counts; normal viewers stay far below this.
  const viewsRateLimit = createRateLimiter({ windowMs: 60_000, limit: 60 });

  // Library and playback (public; admins also see private and unprocessed videos).
  router.get(
    '/',
    optionalAuthenticate,
    validate({ query: listVideosQuerySchema }),
    controller.list,
  );
  router.get('/:id', optionalAuthenticate, withId, controller.getById);
  router.get(
    '/:id/renditions/:label',
    optionalAuthenticate,
    validate({ params: renditionParamsSchema }),
    controller.streamRendition,
  );
  router.get('/:id/thumbnail', optionalAuthenticate, withId, controller.streamThumbnail);
  router.post('/:id/views', viewsRateLimit, withId, controller.recordView);

  // Management (admin only).
  router.post(
    '/',
    adminOnly,
    videoUpload,
    validate({ body: uploadVideoSchema }),
    controller.upload,
    removeUploadedFileOnError,
  );
  router.patch(
    '/:id',
    adminOnly,
    validate({ params: idParamsSchema, body: updateVideoSchema }),
    controller.update,
  );
  router.delete('/:id', adminOnly, withId, controller.delete);
  router.put(
    '/:id/thumbnail',
    adminOnly,
    withId,
    thumbnailUpload,
    controller.replaceThumbnail,
    removeUploadedFileOnError,
  );
  router.post(
    '/:id/thumbnail/frame',
    adminOnly,
    validate({ params: idParamsSchema, body: thumbnailFrameSchema }),
    controller.captureThumbnailFrame,
  );

  return router;
}
