import { createApp } from './app.js';
import { env } from './config/env.js';
import { createContainer } from './container.js';
import { pool } from './db/pool.js';
import { logger } from './lib/logger.js';

// Upper bound for in-flight requests to finish before the process is forced to exit.
const SHUTDOWN_TIMEOUT_MS = 10_000;
// Upper bound for receiving one request; large video uploads on slow connections need time.
const REQUEST_TIMEOUT_MS = 30 * 60 * 1000;

const container = createContainer({ pool });
const app = createApp(container);

const server = app.listen(env.PORT, async () => {
  logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);

  const resumed = await container.videoProcessor.resumePending();
  if (resumed > 0) logger.info(`Resumed processing of ${resumed} video(s)`);
});
server.requestTimeout = REQUEST_TIMEOUT_MS;

let isShuttingDown = false;

function shutdown(reason, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${reason}: shutting down`);

  setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  // Stop accepting connections, let in-flight requests finish, then release database connections.
  server.close(async () => {
    await pool.end();
    process.exit(exitCode);
  });
}

process.on('SIGINT', () => shutdown('SIGINT received'));
process.on('SIGTERM', () => shutdown('SIGTERM received'));

// The process state is unknown after these, so log them and exit; a supervisor restarts the app.
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('Unhandled promise rejection', 1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  shutdown('Uncaught exception', 1);
});
