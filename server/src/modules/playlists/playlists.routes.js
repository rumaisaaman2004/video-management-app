import { Router } from 'express';
import { idParamsSchema } from '../../lib/commonSchemas.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, optionalAuthenticate } from '../auth/auth.middleware.js';
import { createPlaylistsController } from './playlists.controller.js';
import {
  addVideoSchema,
  createPlaylistSchema,
  playlistVideoParamsSchema,
  reorderVideosSchema,
  updatePlaylistSchema,
} from './playlists.schemas.js';

/** Mounted at /api because the routes span /playlists and the user's own /me/playlists. */
export function createPlaylistsRouter({ playlistsService }) {
  const router = Router();
  const controller = createPlaylistsController({ playlistsService });
  const withId = validate({ params: idParamsSchema });

  router.get('/me/playlists', authenticate, controller.listMine);

  router.post(
    '/playlists',
    authenticate,
    validate({ body: createPlaylistSchema }),
    controller.create,
  );
  // Public playlists can be viewed without signing in.
  router.get('/playlists/:id', optionalAuthenticate, withId, controller.getById);
  router.patch(
    '/playlists/:id',
    authenticate,
    validate({ params: idParamsSchema, body: updatePlaylistSchema }),
    controller.update,
  );
  router.delete('/playlists/:id', authenticate, withId, controller.delete);

  router.post(
    '/playlists/:id/videos',
    authenticate,
    validate({ params: idParamsSchema, body: addVideoSchema }),
    controller.addVideo,
  );
  router.put(
    '/playlists/:id/videos/order',
    authenticate,
    validate({ params: idParamsSchema, body: reorderVideosSchema }),
    controller.reorder,
  );
  router.delete(
    '/playlists/:id/videos/:videoId',
    authenticate,
    validate({ params: playlistVideoParamsSchema }),
    controller.removeVideo,
  );

  return router;
}
