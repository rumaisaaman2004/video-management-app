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

/** Query strings and form fields send empty values as ""; treat them as "not provided". */
export function emptyToUndefined(value) {
  return value === '' ? undefined : value;
}

/** Wraps an optional query parameter schema so `?name=` counts as absent. */
export function optionalParam(schema) {
  return z.preprocess(emptyToUndefined, schema.optional());
}

export const MAX_PAGE_SIZE = 50;

export const paginationSchema = z.object({
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(12),
  ),
});

/** LIMIT/OFFSET values for a validated page request. */
export function pageWindow({ page, pageSize }) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

/** Builds the `meta` block returned alongside a page of results. */
export function paginationMeta({ page, pageSize }, total) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
