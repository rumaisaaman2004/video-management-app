import { z } from 'zod';
import { optionalTextSchema } from '../../lib/commonSchemas.js';

// Multipart form fields always arrive as strings; an empty field means "not provided".
const emptyToUndefined = (value) => (value === '' ? undefined : value);

export const uploadVideoSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: optionalTextSchema(5000),
  categoryId: z.preprocess(emptyToUndefined, z.uuid('Must be a valid ID').optional()),
  visibility: z.preprocess(emptyToUndefined, z.enum(['public', 'private']).default('public')),
});
