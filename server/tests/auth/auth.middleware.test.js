import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authenticate, authorize } from '../../src/modules/auth/auth.middleware.js';
import { signAccessToken } from '../../src/modules/auth/tokens.js';
import { createTestApp } from '../helpers/testApp.js';

const app = createTestApp((testApp) => {
  testApp.get('/admin-only', authenticate, authorize('admin'), (req, res) =>
    res.json({ data: req.user }),
  );
});

function tokenFor(role) {
  return signAccessToken({ id: '7f1d6a52-3b8e-4c1a-9d2f-5e6b7c8d9e0f', role });
}

describe('authorize', () => {
  it('allows a user with an accepted role', async () => {
    const res = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${tokenFor('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('admin');
  });

  it('forbids a user without an accepted role', async () => {
    const res = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${tokenFor('user')}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/admin-only').set('Authorization', tokenFor('admin'));

    expect(res.status).toBe(401);
  });
});
