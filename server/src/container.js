import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { createLocalStorage } from './lib/storage/localStorage.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createCategoriesService } from './modules/categories/categories.service.js';
import { createVideoProcessor } from './modules/videos/videoProcessor.js';
import { createVideosService } from './modules/videos/videos.service.js';

const SERVER_ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Composition root: creates each service once and wires it to shared
 * infrastructure. Tests build their own container with test doubles.
 */
export function createContainer({ pool }) {
  const storage = createLocalStorage({ rootDir: path.resolve(SERVER_ROOT, env.STORAGE_DIR) });
  const videoProcessor = createVideoProcessor({
    pool,
    storage,
    concurrency: env.VIDEO_PROCESSING_CONCURRENCY,
  });

  return {
    pool,
    storage,
    videoProcessor,
    authService: createAuthService({ pool }),
    categoriesService: createCategoriesService({ pool }),
    videosService: createVideosService({ pool, storage, videoProcessor }),
  };
}
