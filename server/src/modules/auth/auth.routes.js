import { Router } from 'express';
import { env } from '../../config/env.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { createAuthController } from './auth.controller.js';
import { authenticate } from './auth.middleware.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function createAuthRouter({ authService }) {
  const router = Router();
  const controller = createAuthController({ authService });

  // Slows down password guessing and mass account creation.
  const credentialsRateLimit = createRateLimiter({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: env.AUTH_RATE_LIMIT_MAX,
  });

  router.post(
    '/register',
    credentialsRateLimit,
    validate({ body: registerSchema }),
    controller.register,
  );
  router.post('/login', credentialsRateLimit, validate({ body: loginSchema }), controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}
