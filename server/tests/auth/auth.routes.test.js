import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { createContainer } from '../../src/container.js';
import { pool } from '../../src/db/pool.js';
import { truncateAllTables } from '../helpers/db.js';

const app = createApp(createContainer({ pool }));

const NEW_USER = { name: 'Ana Lima', email: 'ana@example.com', password: 'correct-horse-1' };

function register(agent = request(app), overrides = {}) {
  return agent.post('/api/auth/register').send({ ...NEW_USER, ...overrides });
}

function refreshCookieOf(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith('refreshToken='));
}

describe('auth routes', () => {
  afterEach(() => truncateAllTables(pool));

  describe('POST /api/auth/register', () => {
    it('creates a user and starts a session', async () => {
      const res = await register();

      expect(res.status).toBe(201);
      expect(res.body.data.user).toMatchObject({ name: 'Ana Lima', email: 'ana@example.com' });
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(refreshCookieOf(res)).toMatch(/HttpOnly/);
      expect(refreshCookieOf(res)).toMatch(/SameSite=Strict/);
      expect(refreshCookieOf(res)).toMatch(/Path=\/api\/auth/);
    });

    it('never returns the password hash', async () => {
      const res = await register();

      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it('normalizes the email to lowercase', async () => {
      const res = await register(request(app), { email: '  Ana@Example.COM ' });

      expect(res.body.data.user.email).toBe('ana@example.com');
    });

    it('ignores a client-supplied role', async () => {
      const res = await register(request(app), { role: 'admin' });

      expect(res.body.data.user.role).toBe('user');
    });

    it('rejects an email that is already registered', async () => {
      await register();

      const res = await register(request(app), { email: 'ANA@example.com' });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe('Email is already registered');
    });

    it('validates name, email and password', async () => {
      const res = await register(request(app), { name: '', email: 'nope', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error.details.map((issue) => issue.field)).toEqual([
        'body.name',
        'body.email',
        'body.password',
      ]);
    });
  });

  describe('POST /api/auth/login', () => {
    it('starts a session with valid credentials', async () => {
      await register();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: NEW_USER.email, password: NEW_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(NEW_USER.email);
      expect(refreshCookieOf(res)).toBeDefined();
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      await register();

      const wrongPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: NEW_USER.email, password: 'wrong-password' });
      const unknownEmail = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password' });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the current user for a valid access token', async () => {
      const { body } = await register();

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${body.data.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(NEW_USER.email);
    });

    it('rejects a request without a token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects a token signed with a different secret', async () => {
      const forged = jwt.sign({ role: 'admin' }, 'some-other-secret', {
        subject: 'x',
        issuer: 'video-management-app',
      });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('reports an expired token with TOKEN_EXPIRED', async () => {
      const expired = jwt.sign(
        { role: 'user', exp: Math.floor(Date.now() / 1000) - 60 },
        env.JWT_SECRET,
        { subject: 'x', issuer: 'video-management-app' },
      );

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a new access token and rotates the refresh token', async () => {
      const agent = request.agent(app);
      const registered = await register(agent);

      const res = await agent.post('/api/auth/refresh');

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(refreshCookieOf(res)).not.toBe(refreshCookieOf(registered));
    });

    it('rejects a refresh token that was already used', async () => {
      const registered = await register();
      const originalCookie = refreshCookieOf(registered).split(';')[0];

      await request(app).post('/api/auth/refresh').set('Cookie', originalCookie).expect(200);
      const reused = await request(app).post('/api/auth/refresh').set('Cookie', originalCookie);

      expect(reused.status).toBe(401);
    });

    it('rejects a request without a session cookie', async () => {
      const res = await request(app).post('/api/auth/refresh');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('ends the session so the refresh token stops working', async () => {
      const agent = request.agent(app);
      const registered = await register(agent);
      const originalCookie = refreshCookieOf(registered).split(';')[0];

      const res = await agent.post('/api/auth/logout');
      const afterLogout = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', originalCookie);

      expect(res.status).toBe(204);
      expect(afterLogout.status).toBe(401);
    });
  });
});
