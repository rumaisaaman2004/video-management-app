import { http, HttpResponse } from 'msw';
import { apiError, makeUser, server } from '../test/server.js';
import { api, ApiError, onSessionExpired, setAccessToken } from './apiClient.js';

describe('apiClient', () => {
  it('returns the parsed body and sends query parameters, skipping empty ones', async () => {
    let requestedUrl;
    server.use(
      http.get('/api/videos', ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({ data: [] });
      }),
    );

    const body = await api.get('/videos', { query: { q: 'hooks', page: 2, tag: '' } });

    expect(body).toEqual({ data: [] });
    expect(requestedUrl.search).toBe('?q=hooks&page=2');
  });

  it('sends JSON bodies and the access token', async () => {
    let received;
    server.use(
      http.post('/api/playlists', async ({ request }) => {
        received = {
          auth: request.headers.get('authorization'),
          body: await request.json(),
        };
        return HttpResponse.json({ data: { id: 'p1' } }, { status: 201 });
      }),
    );
    setAccessToken('token-1');

    await api.post('/playlists', { title: 'Course' });

    expect(received).toEqual({ auth: 'Bearer token-1', body: { title: 'Course' } });
  });

  it('returns null for 204 responses', async () => {
    server.use(http.delete('/api/videos/v1', () => new HttpResponse(null, { status: 204 })));

    expect(await api.delete('/videos/v1')).toBeNull();
  });

  it('throws ApiError with the server code, message and field details', async () => {
    server.use(
      http.post('/api/auth/register', () =>
        apiError(400, 'VALIDATION_ERROR', 'Request validation failed', [
          { field: 'body.email', message: 'Must be a valid email address' },
        ]),
      ),
    );

    const error = await api.post('/auth/register', {}).catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [{ field: 'body.email', message: 'Must be a valid email address' }],
    });
  });

  it('reports a network failure in plain language', async () => {
    server.use(http.get('/api/videos', () => HttpResponse.error()));

    const error = await api.get('/videos').catch((err) => err);

    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(error.message).toMatch(/could not reach the server/i);
  });

  describe('expired access tokens', () => {
    function useExpiringApi({ refreshSucceeds = true } = {}) {
      const calls = { refresh: 0 };
      server.use(
        http.get('/api/me/history', ({ request }) =>
          request.headers.get('authorization') === 'Bearer fresh'
            ? HttpResponse.json({ data: ['ok'] })
            : apiError(401, 'TOKEN_EXPIRED', 'Access token has expired'),
        ),
        http.post('/api/auth/refresh', async () => {
          calls.refresh += 1;
          return refreshSucceeds
            ? HttpResponse.json({ data: { user: makeUser(), accessToken: 'fresh' } })
            : apiError(401, 'UNAUTHORIZED', 'Session has expired, please log in again');
        }),
      );
      setAccessToken('stale');
      return calls;
    }

    it('renews the session once and retries the request', async () => {
      const calls = useExpiringApi();

      expect(await api.get('/me/history')).toEqual({ data: ['ok'] });
      expect(calls.refresh).toBe(1);
    });

    it('shares one renewal between requests that expire at the same time', async () => {
      const calls = useExpiringApi();

      const results = await Promise.all([
        api.get('/me/history'),
        api.get('/me/history'),
        api.get('/me/history'),
      ]);

      expect(results).toHaveLength(3);
      expect(calls.refresh).toBe(1);
    });

    it('notifies listeners and fails when the session cannot be renewed', async () => {
      useExpiringApi({ refreshSucceeds: false });
      const listener = vi.fn();
      const unsubscribe = onSessionExpired(listener);

      const error = await api.get('/me/history').catch((err) => err);
      unsubscribe();

      expect(error).toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' });
      expect(listener).toHaveBeenCalledOnce();
    });
  });
});
