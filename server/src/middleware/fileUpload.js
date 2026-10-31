import { rm } from 'node:fs/promises';
import multer from 'multer';
import { AppError } from '../errors/AppError.js';

const MB = 1024 * 1024;

/**
 * Accepts one file in `fieldName`, streamed to a randomly named file in
 * `tempDir` (the client's file name is never used in a path). Must run after
 * authentication so anonymous clients cannot write to disk.
 */
export function createFileUpload({ fieldName, tempDir, maxSizeMb, allowedMimeTypes, typeLabel }) {
  return multer({
    dest: tempDir,
    limits: { fileSize: maxSizeMb * MB, files: 1, fields: 20, fieldSize: 64 * 1024 },
    // A cheap first check on the declared type; the real content is verified after upload.
    fileFilter(_req, file, callback) {
      if (allowedMimeTypes.includes(file.mimetype)) return callback(null, true);
      callback(
        AppError.validation([{ field: `body.${fieldName}`, message: `File must be ${typeLabel}` }]),
      );
    },
  }).single(fieldName);
}

/** Route-level error middleware that deletes the temporary upload when a request fails. */
export async function removeUploadedFileOnError(err, req, _res, next) {
  if (req.file?.path) await rm(req.file.path, { force: true });
  next(err);
}
