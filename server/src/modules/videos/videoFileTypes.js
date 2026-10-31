import { fileTypeFromFile } from 'file-type';

// Container formats accepted for upload, keyed by MIME type, with the stored file extension.
const SUPPORTED_VIDEO_TYPES = {
  'video/mp4': 'mp4',
  'video/x-m4v': 'm4v',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
};

export const SUPPORTED_VIDEO_MIME_TYPES = Object.keys(SUPPORTED_VIDEO_TYPES);
export const SUPPORTED_VIDEO_FORMATS_LABEL = 'MP4, MOV, WebM or MKV';

/**
 * Identifies a file by its content (magic bytes), ignoring the name and the
 * client-declared type. Returns `{ mimeType, extension }`, or null if unsupported.
 */
export async function detectVideoFileType(filePath) {
  const detected = await fileTypeFromFile(filePath);
  const extension = SUPPORTED_VIDEO_TYPES[detected?.mime];
  return extension ? { mimeType: detected.mime, extension } : null;
}
