import { fileTypeFromFile } from 'file-type';

// Formats accepted for upload, keyed by MIME type, with the stored file extension.
const SUPPORTED_VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/x-m4v': 'm4v',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
};

const SUPPORTED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const SUPPORTED_VIDEO_MIME_TYPES = Object.keys(SUPPORTED_VIDEO_TYPES);
export const SUPPORTED_VIDEO_FORMATS_LABEL = 'MP4, MOV, WebM or MKV';

export const SUPPORTED_IMAGE_MIME_TYPES = Object.keys(SUPPORTED_IMAGE_TYPES);
export const SUPPORTED_IMAGE_FORMATS_LABEL = 'JPEG, PNG or WebP';

/**
 * Identifies a file by its content (magic bytes), ignoring the name and the
 * client-declared type. Returns `{ mimeType, extension }`, or null if not in `supportedTypes`.
 */
async function detectFileType(filePath, supportedTypes) {
  const detected = await fileTypeFromFile(filePath);
  const extension = supportedTypes[detected?.mime];
  return extension ? { mimeType: detected.mime, extension } : null;
}

export function detectVideoFileType(filePath) {
  return detectFileType(filePath, SUPPORTED_VIDEO_TYPES);
}

export function detectImageFileType(filePath) {
  return detectFileType(filePath, SUPPORTED_IMAGE_TYPES);
}
