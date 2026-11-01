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

const NETWORK_ERROR = {
  status: 0,
  code: 'NETWORK_ERROR',
  message: 'Could not reach the server. Check your connection and try again.',
};

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
    throw new ApiError(NETWORK_ERROR);
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
 * Runs `sendRequest()` (which resolves to a Response). If the access token has
 * expired, renews the session once and sends again; then parses the result.
 */
async function withSessionRenewal(sendRequest) {
  let response = await sendRequest();

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
      response = await sendRequest();
    }
  }

  return parseResponse(response);
}

/**
 * Sends a request and returns the parsed JSON body (`{ data, meta? }`), or null for 204.
 * Options: `method`, `body` (object or FormData), `query` (object), `signal`.
 */
export function apiRequest(path, options = {}) {
  return withSessionRenewal(() => send(path, options));
}

/** XMLHttpRequest wrapped to resolve with a Response, because only XHR reports upload progress. */
function sendWithProgress(path, formData, { method, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, buildUrl(path));
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      const body = xhr.status === 204 ? null : xhr.responseText;
      resolve(new Response(body, { status: xhr.status }));
    };
    xhr.onerror = () => reject(new ApiError(NETWORK_ERROR));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    xhr.send(formData);
  });
}

/**
 * Uploads FormData and reports progress through `onProgress(fraction)` (0 to 1).
 * Behaves like apiRequest otherwise; cancel with an AbortController `signal`.
 */
export function upload(path, formData, { method = 'POST', onProgress, signal } = {}) {
  return withSessionRenewal(() => sendWithProgress(path, formData, { method, onProgress, signal }));
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};
