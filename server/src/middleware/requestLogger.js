import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger.js';

// Accept upstream IDs only in a safe shape so clients cannot inject arbitrary log content.
const REQUEST_ID_PATTERN = /^[\w-]{1,100}$/;

export const requestLogger = pinoHttp({
  logger,

  // Reuse the ID from a load balancer or client so one request can be traced across services.
  genReqId(req, res) {
    const incomingId = req.headers['x-request-id'];
    const isValidId = typeof incomingId === 'string' && REQUEST_ID_PATTERN.test(incomingId);
    const id = isValidId ? incomingId : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },

  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
