import { Router } from 'express';
import { env } from '../../config/env.js';
import { createFileUpload, removeUploadedFileOnError } from '../../middleware/fileUpload.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../auth/auth.middleware.js';
import { SUPPORTED_VIDEO_FORMATS_LABEL, SUPPORTED_VIDEO_MIME_TYPES } from './videoFileTypes.js';
import { createVideosController } from './videos.controller.js';
import { uploadVideoSchema } from './videos.schemas.js';

export function createVideosRouter({ videosService, storage }) {
  const router = Router();
  const controller = createVideosController({ videosService });

  const videoUpload = createFileUpload({
    fieldName: 'file',
    tempDir: storage.tempDir,
    maxSizeMb: env.MAX_UPLOAD_SIZE_MB,
    allowedMimeTypes: SUPPORTED_VIDEO_MIME_TYPES,
    typeLabel: SUPPORTED_VIDEO_FORMATS_LABEL,
  });

  router.post(
    '/',
    authenticate,
    authorize('admin'),
    videoUpload,
    validate({ body: uploadVideoSchema }),
    controller.upload,
    removeUploadedFileOnError,
  );

  return router;
}
