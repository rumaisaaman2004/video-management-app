import express from 'express';

/**
 * Builds the Express application without starting a server,
 * so tests can exercise it directly with Supertest.
 */
export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
