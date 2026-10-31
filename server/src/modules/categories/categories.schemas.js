import { z } from 'zod';
import { optionalTextSchema, slugSchema } from '../../lib/commonSchemas.js';

const nameSchema = z.string().trim().min(1, 'Name is required').max(60);

export const createCategorySchema = z.object({
  name: nameSchema,
  // Generated from the name when omitted.
  slug: slugSchema.optional(),
  description: optionalTextSchema(500),
});

export const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: optionalTextSchema(500),
  })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), {
    message: 'Provide at least one field to update',
  });
