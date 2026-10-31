import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../src/middleware/rateLimiter.js';
import { createTestApp } from '../helpers/testApp.js';

const app = createTestApp((testApp) => {
  testApp.post('/limited', createRateLimiter({ windowMs: 60_000, limit: 2 }), (req, res) =>
    res.status(204).end(),
  );
});

describe('createRateLimiter', () => {
  it('blocks requests over the limit with the standard error format', async () => {
    await request(app).post('/limited').expect(204);
    await request(app).post('/limited').expect(204);

    const res = await request(app).post('/limited');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(res.headers.ratelimit).toBeDefined();
  });
});
