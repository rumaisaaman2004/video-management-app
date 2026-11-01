// Matches the server's default MAX_UPLOAD_SIZE_MB; the server still enforces its own limit.
export const MAX_UPLOAD_SIZE_MB = 500;
const ACCEPTED_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm', 'mkv'];

/** Value for a file input's `accept`: what the server accepts. */
export const VIDEO_ACCEPT = ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(',');

function extensionOf(fileName) {
  return fileName.split('.').pop().toLowerCase();
}

/** Checks a chosen file before uploading, so a wrong or huge file is not sent for nothing. */
export function validateVideoFile(file) {
  if (!file) return 'Choose a video file to upload';
  if (!ACCEPTED_EXTENSIONS.includes(extensionOf(file.name))) {
    return 'Choose an MP4, MOV, WebM or MKV file';
  }
  if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
    return `The file is larger than ${MAX_UPLOAD_SIZE_MB} MB`;
  }
  return null;
}

/** A starting title from the file name: "react_hooks-intro.mp4" → "React hooks intro". */
export function titleFromFileName(fileName) {
  const words = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_.]+/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "12.3 MB" */
export function formatFileSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
