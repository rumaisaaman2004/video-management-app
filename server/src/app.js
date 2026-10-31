import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createApiRouter } from './routes.js';

/**
 * Builds the Express application without starting a server, so tests can
 * exercise it directly with Supertest and pass in their own dependencies.
 */
export function createApp({ pool }) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', createApiRouter({ pool }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
