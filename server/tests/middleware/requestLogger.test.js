import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/testApp.js';

const app = createTestApp((testApp) => {
  testApp.get('/ping', (req, res) => res.json({ data: { requestId: req.id } }));
});

describe('requestLogger', () => {
  it('assigns a request ID and returns it in the X-Request-Id header', async () => {
    const res = await request(app).get('/ping');

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.data.requestId).toBe(res.headers['x-request-id']);
  });

  it('reuses a well-formed request ID from upstream', async () => {
    const res = await request(app).get('/ping').set('X-Request-Id', 'lb-abc-123');

    expect(res.headers['x-request-id']).toBe('lb-abc-123');
  });

  it('replaces a malformed upstream request ID', async () => {
    const res = await request(app).get('/ping').set('X-Request-Id', 'bad id <script>');

    expect(res.headers['x-request-id']).not.toBe('bad id <script>');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
