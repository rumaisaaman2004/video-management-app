import { Router } from 'express';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createHealthRouter } from './modules/health/health.routes.js';

/** Mounts every feature module's router. Served under /api. */
export function createApiRouter(container) {
  const router = Router();

  router.use('/health', createHealthRouter(container));
  router.use('/auth', createAuthRouter(container));

  return router;
}
