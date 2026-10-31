import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/** A user as the API returns it. */
export function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    name: 'Ana Lima',
    email: 'ana@example.com',
    role: 'user',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

/** The API's error format: `{ error: { code, message, details? } }`. */
export function apiError(status, code, message, details) {
  return HttpResponse.json({ error: { code, message, details } }, { status });
}

// Default: nobody is signed in. Tests override handlers with server.use(...).
const defaultHandlers = [
  http.post('/api/auth/refresh', () => apiError(401, 'UNAUTHORIZED', 'No active session')),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
];

/** Fake API for tests: requests never reach the real server. */
export const server = setupServer(...defaultHandlers);
