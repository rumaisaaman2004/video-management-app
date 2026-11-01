import { z } from 'zod';
import { idParamsSchema, optionalTextSchema } from '../../lib/commonSchemas.js';

export const MAX_PLAYLIST_VIDEOS = 200;

const titleSchema = z.string().trim().min(1, 'Title is required').max(150);
const visibilitySchema = z.enum(['public', 'private']);

export const createPlaylistSchema = z.object({
  title: titleSchema,
  description: optionalTextSchema(1000),
  visibility: visibilitySchema.default('private'),
});

export const updatePlaylistSchema = z
  .object({
    title: titleSchema.optional(),
    description: optionalTextSchema(1000),
    visibility: visibilitySchema.optional(),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

export const addVideoSchema = z.object({
  videoId: z.uuid('Must be a valid ID'),
});

export const reorderVideosSchema = z.object({
  videoIds: z.array(z.uuid('Must be a valid ID')).max(MAX_PLAYLIST_VIDEOS),
});

export const playlistVideoParamsSchema = idParamsSchema.extend({
  videoId: z.uuid('Must be a valid ID'),
});
