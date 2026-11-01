import pino from 'pino';
import { env } from '../config/env.js';

/** Credentials that must never reach the logs, wherever they appear in a request. */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  // Signed media URLs carry their credential in the query string.
  'req.query.signature',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  // Human-readable output in development; structured JSON everywhere else.
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
      : undefined,
  redact: LOG_REDACT_PATHS,
});
