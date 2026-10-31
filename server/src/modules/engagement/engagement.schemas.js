import { z } from 'zod';
import { emptyToUndefined, paginationSchema } from '../../lib/commonSchemas.js';

// Generous upper bound (24 hours) that still rejects absurd values.
const MAX_POSITION_SECONDS = 24 * 60 * 60;

export const progressSchema = z.object({
  positionSeconds: z.number().min(0).max(MAX_POSITION_SECONDS),
});

export const historyQuerySchema = paginationSchema.extend({
  // Query strings carry booleans as text; only "true" switches the filter on.
  inProgress: z.preprocess(
    emptyToUndefined,
    z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  ),
});
