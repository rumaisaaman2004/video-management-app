import { env } from './config/env.js';
import { fromServerRoot } from './config/paths.js';
import { createLocalStorage } from './lib/storage/localStorage.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createCategoriesService } from './modules/categories/categories.service.js';
import { createEngagementService } from './modules/engagement/engagement.service.js';
import { createPlaylistsService } from './modules/playlists/playlists.service.js';
import { createVideoProcessor } from './modules/videos/videoProcessor.js';
import { createVideosService } from './modules/videos/videos.service.js';

/**
 * Composition root: creates each service once and wires it to shared
 * infrastructure. Tests build their own container with test doubles.
 */
export function createContainer({ pool }) {
  const storage = createLocalStorage({ rootDir: fromServerRoot(env.STORAGE_DIR) });
  const videoProcessor = createVideoProcessor({
    pool,
    storage,
    concurrency: env.VIDEO_PROCESSING_CONCURRENCY,
  });

  const videosService = createVideosService({ pool, storage, videoProcessor });

  return {
    pool,
    storage,
    videoProcessor,
    authService: createAuthService({ pool }),
    categoriesService: createCategoriesService({ pool }),
    videosService,
    engagementService: createEngagementService({ pool, videosService }),
    playlistsService: createPlaylistsService({ pool, videosService }),
  };
}
