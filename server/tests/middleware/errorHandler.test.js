import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool.js';
import { AppError } from '../../src/errors/AppError.js';
import { truncateAllTables } from '../helpers/db.js';
import { createTestApp } from '../helpers/testApp.js';

const app = createTestApp((testApp) => {
  testApp.get('/app-error', () => {
    throw AppError.conflict('Email is already registered');
  });
  testApp.get('/unexpected-error', () => {
    throw new Error('secret internal detail');
  });
  testApp.post('/json', (req, res) => res.json({ data: req.body }));
  testApp.post('/categories', async (req, res) => {
    await pool.query('INSERT INTO categories (name, slug) VALUES ($1, $2)', [
      req.body.name,
      req.body.slug,
    ]);
    res.status(201).end();
  });
});

describe('errorHandler', () => {
  afterEach(() => truncateAllTables(pool));

  it('returns AppError status, code and message', async () => {
    const res = await request(app).get('/app-error');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: 'CONFLICT', message: 'Email is already registered' },
    });
  });

  it('hides details of unexpected errors behind a generic 500 with a request ID', async () => {
    const res = await request(app).get('/unexpected-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        requestId: res.headers['x-request-id'],
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  describe('database errors', () => {
    it('maps a unique violation to 409', async () => {
      const category = { name: 'Physics', slug: 'physics' };
      await request(app).post('/categories').send(category).expect(201);

      const res = await request(app).post('/categories').send(category);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('maps a check violation to 400', async () => {
      const res = await request(app)
        .post('/categories')
        .send({ name: 'Physics', slug: 'Not A Slug' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });
});
