import { z } from 'zod';

/** Route params for `/:id` resources. */
export const idParamsSchema = z.object({
  id: z.uuid('Must be a valid ID'),
});

/** Same rule as the database CHECK constraint on slugs, e.g. "web-development". */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

/** Optional free text where an empty string means "no value". */
export function optionalTextSchema(maxLength) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .optional()
    .transform((value) => (value === '' ? null : value));
}
