import { Writable } from 'node:stream';
import express from 'express';
import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { LOG_REDACT_PATHS } from '../../src/lib/logger.js';
import { createRequestLogger } from '../../src/middleware/requestLogger.js';

/** Runs one request through the real request logger and returns everything it wrote. */
async function captureRequestLog(sendRequest) {
  const lines = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const testLogger = pino({ level: 'info', redact: LOG_REDACT_PATHS }, destination);

  const app = express();
  app.use(createRequestLogger(testLogger));
  app.get('/media', (req, res) => res.end());

  await sendRequest(request(app));
  return lines.join('');
}

describe('request log redaction', () => {
  it('never writes credentials to the log', async () => {
    const output = await captureRequestLog((agent) =>
      agent
        .get('/media?expires=123&signature=SECRET-SIGNATURE')
        .set('Authorization', 'Bearer SECRET-TOKEN')
        .set('Cookie', 'refreshToken=SECRET-COOKIE'),
    );

    expect(output).toContain('request completed');
    expect(output).not.toMatch(/SECRET-(SIGNATURE|TOKEN|COOKIE)/);
    expect(output).toContain('signature=[Redacted]');
  });
});
