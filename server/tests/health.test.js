import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('GET /api/health', () => {
  it('reports ok when the database is reachable', async () => {
    const res = await request(createApp({ pool })).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok', database: 'up' } });
  });

  it('responds 503 when the database is unreachable', async () => {
    const unreachablePool = { query: () => Promise.reject(new Error('connection refused')) };

    const res = await request(createApp({ pool: unreachablePool })).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('sets security headers', async () => {
    const res = await request(createApp({ pool })).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('unknown routes', () => {
  it('respond 404 with the standard error format', async () => {
    const res = await request(createApp({ pool })).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /api/does-not-exist not found' },
    });
  });
});
