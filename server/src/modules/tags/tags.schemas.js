import { z } from 'zod';

export const MAX_TAGS_PER_VIDEO = 10;

// Letters and digits, plus the symbols used in names like "c++", "c#" and "node.js".
const tagNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(40)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} +#.-]*$/u, 'Tags may contain letters, numbers, spaces, + # . -');

/** A list of tag names, de-duplicated after normalizing case and whitespace. */
export const tagListSchema = z
  .array(tagNameSchema)
  .max(MAX_TAGS_PER_VIDEO, `Use at most ${MAX_TAGS_PER_VIDEO} tags`)
  .transform((names) => [...new Set(names)]);

/** Multipart forms send tags as one comma-separated string: "react, hooks". */
export const commaSeparatedTagsSchema = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      : value,
  tagListSchema,
);
