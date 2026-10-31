import { Router } from 'express';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createCategoriesRouter } from './modules/categories/categories.routes.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createTagsRouter } from './modules/tags/tags.routes.js';
import { createVideosRouter } from './modules/videos/videos.routes.js';

/** Mounts every feature module's router. Served under /api. */
export function createApiRouter(container) {
  const router = Router();

  router.use('/health', createHealthRouter(container));
  router.use('/auth', createAuthRouter(container));
  router.use('/categories', createCategoriesRouter(container));
  router.use('/videos', createVideosRouter(container));
  router.use('/tags', createTagsRouter(container));

  return router;
}
