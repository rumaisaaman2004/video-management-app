import { Router } from 'express';
import { createHealthRouter } from './modules/health/health.routes.js';

/** Mounts every feature module's router. Served under /api. */
export function createApiRouter(deps) {
  const router = Router();

  router.use('/health', createHealthRouter(deps));

  return router;
}
