import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createContainer } from '../../src/container.js';
import { pool } from '../../src/db/pool.js';
import { truncateAllTables } from '../helpers/db.js';

const app = createApp(createContainer({ pool }));

async function registerAndGetCookie() {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Ana Lima', email: 'ana@example.com', password: 'correct-horse-1' });
  return { accessToken: res.body.data.accessToken, cookie: sessionCookieOf(res) };
}

function sessionCookieOf(res) {
  return res.headers['set-cookie']
    .find((cookie) => cookie.startsWith('refreshToken='))
    .split(';')[0];
}

function refreshWith(cookie) {
  return request(app).post('/api/auth/refresh').set('Cookie', cookie);
}

// Simulates time passing beyond the reuse grace period.
function ageUsedTokens() {
  return pool.query(
    "UPDATE refresh_tokens SET used_at = now() - interval '1 minute' WHERE used_at IS NOT NULL",
  );
}

describe('session security', () => {
  afterEach(() => truncateAllTables(pool));

  describe('refresh token reuse detection', () => {
    it('revokes the whole session when a used token is replayed', async () => {
      const { cookie: stolenCookie } = await registerAndGetCookie();
      const rotated = await refreshWith(stolenCookie).expect(200);
      await ageUsedTokens();

      const replay = await refreshWith(stolenCookie);
      const legitimate = await refreshWith(sessionCookieOf(rotated));

      expect(replay.status).toBe(401);
      expect(legitimate.status).toBe(401);
    });

    it('refuses a just-used token without revoking the session (concurrent tabs)', async () => {
      const { cookie } = await registerAndGetCookie();
      const rotated = await refreshWith(cookie).expect(200);

      const duplicate = await refreshWith(cookie);
      const legitimate = await refreshWith(sessionCookieOf(rotated));

      expect(duplicate.status).toBe(401);
      expect(legitimate.status).toBe(200);
    });

    it('stores only token hashes', async () => {
      const { cookie } = await registerAndGetCookie();
      const rawToken = cookie.split('=')[1];

      const { rows } = await pool.query('SELECT token_hash FROM refresh_tokens');

      expect(rows).toHaveLength(1);
      expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(rows[0].token_hash).not.toBe(rawToken);
    });
  });

  describe('malformed input', () => {
    it.each([
      ['a JSON cookie', 'refreshToken=j:{"a":1}'],
      ['a too-short token', 'refreshToken=abc'],
    ])('rejects %s on refresh with 401, not 500', async (_label, cookie) => {
      const res = await refreshWith(cookie);

      expect(res.status).toBe(401);
    });

    it('logs out cleanly even with a malformed cookie', async () => {
      const res = await request(app).post('/api/auth/logout').set('Cookie', 'refreshToken=j:{}');

      expect(res.status).toBe(204);
    });
  });

  it('accepts the Bearer scheme in any letter case', async () => {
    const { accessToken } = await registerAndGetCookie();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });
});
