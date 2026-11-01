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

/** A video card as the API returns it. */
export function makeVideo(overrides = {}) {
  return {
    id: 'video-1',
    title: 'React Hooks in Depth',
    description: null,
    status: 'ready',
    visibility: 'public',
    durationSeconds: 125,
    viewCount: 42,
    likeCount: 3,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    category: { id: 'cat-1', name: 'Web Development', slug: 'web-development' },
    uploader: { id: 'admin-1', name: 'Demo Admin' },
    tags: ['react'],
    thumbnailUrl: '/api/videos/video-1/thumbnail?v=1',
    ...overrides,
  };
}

/** A playlist as the API returns it (`videos` only on the detail endpoint). */
export function makePlaylist(overrides = {}) {
  return {
    id: 'playlist-1',
    title: 'Frontend course',
    description: null,
    visibility: 'private',
    videoCount: 0,
    coverThumbnailUrl: null,
    owner: { id: 'user-1', name: 'Ana Lima' },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

/** The API's error format: `{ error: { code, message, details? } }`. */
export function apiError(status, code, message, details) {
  return HttpResponse.json({ error: { code, message, details } }, { status });
}

/** A page of results in the API's list format. */
export function pageOf(items, { page = 1, pageSize = 12, total = items.length } = {}) {
  return HttpResponse.json({
    data: items,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

// Defaults: nobody is signed in, and the library and personal lists are empty.
// Tests override handlers with server.use(...).
const defaultHandlers = [
  http.post('/api/auth/refresh', () => apiError(401, 'UNAUTHORIZED', 'No active session')),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/videos', () => pageOf([])),
  http.get('/api/categories', () => HttpResponse.json({ data: [] })),
  http.get('/api/tags', () => HttpResponse.json({ data: [] })),
  http.get('/api/me/history', () => pageOf([])),
  http.get('/api/me/bookmarks', () => pageOf([])),
  http.get('/api/me/playlists', () => HttpResponse.json({ data: [] })),
];

/** Fake API for tests: requests never reach the real server. */
export const server = setupServer(...defaultHandlers);
