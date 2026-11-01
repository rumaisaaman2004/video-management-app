import { z } from 'zod';
import {
  emptyToUndefined,
  idParamsSchema,
  optionalParam,
  optionalTextSchema,
  paginationSchema,
  slugSchema,
} from '../../lib/commonSchemas.js';
import { commaSeparatedTagsSchema, tagListSchema } from '../tags/tags.schemas.js';

const VISIBILITIES = ['public', 'private'];
const STATUSES = ['processing', 'ready', 'failed'];
export const SORT_OPTIONS = [
  'relevance',
  'newest',
  'oldest',
  'popular',
  'least-viewed',
  'title',
  'title-desc',
];

const titleSchema = z.string().trim().min(1, 'Title is required').max(200);

// Multipart form fields always arrive as strings.
export const uploadVideoSchema = z.object({
  title: titleSchema,
  description: optionalTextSchema(5000),
  categoryId: optionalParam(z.uuid('Must be a valid ID')),
  visibility: z.preprocess(emptyToUndefined, z.enum(VISIBILITIES).default('public')),
  tags: optionalParam(commaSeparatedTagsSchema),
});

export const updateVideoSchema = z
  .object({
    title: titleSchema.optional(),
    description: optionalTextSchema(5000),
    // null removes the category.
    categoryId: z.uuid('Must be a valid ID').nullable().optional(),
    visibility: z.enum(VISIBILITIES).optional(),
    // Replaces the full set of tags; [] removes them all.
    tags: tagListSchema.optional(),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });

export const listVideosQuerySchema = paginationSchema.extend({
  q: optionalParam(z.string().trim().max(200)),
  category: optionalParam(slugSchema),
  tag: optionalParam(z.string().trim().toLowerCase().max(40)),
  sort: optionalParam(z.enum(SORT_OPTIONS)),
  // Honored for admins only; everyone else always sees ready, public videos.
  status: optionalParam(z.enum(STATUSES)),
  visibility: optionalParam(z.enum(VISIBILITIES)),
});

export const renditionParamsSchema = idParamsSchema.extend({
  label: z.string().regex(/^\d{2,4}p$/, 'Must be a quality label such as 720p'),
});

export const thumbnailFrameSchema = z.object({
  atSeconds: z.number().min(0),
});
