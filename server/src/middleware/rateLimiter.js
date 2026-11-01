import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

/**
 * Limits requests per client IP. The default store keeps counts in this
 * process's memory; when running several instances, pass a shared store
 * (e.g. Redis via rate-limit-redis) so limits apply across all of them.
 */
export function createRateLimiter({ windowMs, limit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(_req, _res, next) {
      next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many requests, please try again later'));
    },
  });
}
