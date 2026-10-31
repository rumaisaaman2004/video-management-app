import express from 'express';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { notFound } from '../../src/middleware/notFound.js';
import { requestLogger } from '../../src/middleware/requestLogger.js';

/**
 * Builds a minimal app with the real middleware stack around test-only routes,
 * so middleware can be tested in isolation from feature modules.
 */
export function createTestApp(registerRoutes) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());
  registerRoutes(app);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
