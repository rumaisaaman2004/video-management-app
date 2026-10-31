import { Router } from 'express';
import { idParamsSchema, paginationSchema } from '../../lib/commonSchemas.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../auth/auth.middleware.js';
import { createEngagementController } from './engagement.controller.js';
import { historyQuerySchema, progressSchema } from './engagement.schemas.js';

/**
 * Per-user interactions. Mounted at /api because the routes span two areas:
 * actions on a video (/videos/:id/...) and the user's own lists (/me/...).
 * Every route requires a signed-in user.
 */
export function createEngagementRouter({ engagementService }) {
  const router = Router();
  const controller = createEngagementController({ engagementService });
  const withId = validate({ params: idParamsSchema });

  router.put('/videos/:id/like', authenticate, withId, controller.like);
  router.delete('/videos/:id/like', authenticate, withId, controller.unlike);
  router.put('/videos/:id/bookmark', authenticate, withId, controller.bookmark);
  router.delete('/videos/:id/bookmark', authenticate, withId, controller.unbookmark);
  router.put(
    '/videos/:id/progress',
    authenticate,
    validate({ params: idParamsSchema, body: progressSchema }),
    controller.saveProgress,
  );

  router.get(
    '/me/bookmarks',
    authenticate,
    validate({ query: paginationSchema }),
    controller.listBookmarks,
  );
  router.get(
    '/me/history',
    authenticate,
    validate({ query: historyQuerySchema }),
    controller.listHistory,
  );
  router.delete('/me/history/:id', authenticate, withId, controller.removeFromHistory);
  router.delete('/me/history', authenticate, controller.clearHistory);

  return router;
}
