/**
 * The only module that talks to the backend. It attaches the access token,
 * renews an expired session once and retries, and turns every failure into an
 * ApiError with the server's `{ code, message, details }`.
 */

/** An API failure with the server's error code and, for validation errors, field details. */
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Kept in memory only (never localStorage), so injected scripts cannot read it later.
let accessToken = null;
let refreshInFlight = null;
const sessionExpiredListeners = new Set();

export function setAccessToken(token) {
  accessToken = token;
}

/** Called when the session can no longer be renewed. Returns an unsubscribe function. */
export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function buildUrl(path, query) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, value);
  }
  return url;
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const body = await response.json().catch(() => null);
  if (response.ok) return body;

  throw new ApiError({
    status: response.status,
    code: body?.error?.code ?? 'UNKNOWN_ERROR',
    message: body?.error?.message ?? 'Something went wrong. Please try again.',
    details: body?.error?.details,
  });
}

async function send(path, { method = 'GET', body, query, signal }) {
  const isFormData = body instanceof FormData;
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers,
      body: isFormData || body === undefined ? body : JSON.stringify(body),
      signal,
      credentials: 'same-origin',
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  }
}

/**
 * Exchanges the refresh cookie for a new session: `{ user, accessToken }`.
 * Requests that expire at the same moment share one refresh, because the
 * server accepts each refresh token only once.
 */
export function refreshSession() {
  refreshInFlight ??= send('/auth/refresh', { method: 'POST' })
    .then(parseResponse)
    .then(({ data }) => {
      accessToken = data.accessToken;
      return data;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/**
 * Sends a request and returns the parsed JSON body (`{ data, meta? }`), or null for 204.
 * Options: `method`, `body` (object or FormData), `query` (object), `signal`.
 */
export async function apiRequest(path, options = {}) {
  let response = await send(path, options);

  // An expired access token is renewed silently, then the request is tried once more.
  if (response.status === 401 && accessToken) {
    const { error } = await response
      .clone()
      .json()
      .catch(() => ({}));

    if (error?.code === 'TOKEN_EXPIRED') {
      try {
        await refreshSession();
      } catch {
        accessToken = null;
        sessionExpiredListeners.forEach((listener) => listener());
        return parseResponse(response);
      }
      response = await send(path, options);
    }
  }

  return parseResponse(response);
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
