import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The server/ folder; relative paths in settings (storage, client build) are resolved from it. */
export const SERVER_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export function fromServerRoot(relativeOrAbsolutePath) {
  return path.resolve(SERVER_ROOT, relativeOrAbsolutePath);
}
