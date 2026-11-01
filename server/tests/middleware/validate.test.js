import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';
import { createTestApp } from '../helpers/testApp.js';

const app = createTestApp((testApp) => {
  testApp.post(
    '/items/:id',
    validate({
      params: z.object({ id: z.uuid() }),
      query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
      body: z.object({ title: z.string().trim().min(1) }),
    }),
    (req, res) => res.json({ data: req.validated }),
  );
});

const VALID_ID = '7f1d6a52-3b8e-4c1a-9d2f-5e6b7c8d9e0f';

describe('validate middleware', () => {
  it('exposes parsed and coerced values on req.validated', async () => {
    const res = await request(app).post(`/items/${VALID_ID}?page=2`).send({ title: '  Intro  ' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      params: { id: VALID_ID },
      query: { page: 2 },
      body: { title: 'Intro' },
    });
  });

  it('applies schema defaults', async () => {
    const res = await request(app).post(`/items/${VALID_ID}`).send({ title: 'Intro' });

    expect(res.body.data.query).toEqual({ page: 1 });
  });

  it('reports every invalid field across params, query and body', async () => {
    const res = await request(app).post('/items/not-a-uuid?page=0').send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((issue) => issue.field)).toEqual([
      'params.id',
      'query.page',
      'body.title',
    ]);
  });

  it('rejects a missing body', async () => {
    const res = await request(app).post(`/items/${VALID_ID}`);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('body');
  });
});
