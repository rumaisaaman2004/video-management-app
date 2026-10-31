import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { isWellFormedRefreshToken } from './tokens.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const DAY_MS = 24 * 60 * 60 * 1000;

// httpOnly keeps the token away from JavaScript (XSS); SameSite=Strict blocks cross-site
// requests (CSRF); the path limits which requests carry it at all.
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * DAY_MS,
};

/** Returns the refresh token cookie, or null if it is missing or malformed. */
function readRefreshToken(req) {
  const value = req.cookies[REFRESH_COOKIE_NAME];
  return isWellFormedRefreshToken(value) ? value : null;
}

function sendSession(res, statusCode, { user, accessToken, refreshToken }) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(statusCode).json({ data: { user, accessToken } });
}

export function createAuthController({ authService }) {
  return {
    async register(req, res) {
      sendSession(res, 201, await authService.register(req.validated.body));
    },

    async login(req, res) {
      sendSession(res, 200, await authService.login(req.validated.body));
    },

    async refresh(req, res) {
      const refreshToken = readRefreshToken(req);
      if (!refreshToken) throw AppError.unauthorized('No active session');

      sendSession(res, 200, await authService.refresh(refreshToken));
    },

    async logout(req, res) {
      const refreshToken = readRefreshToken(req);
      if (refreshToken) await authService.logout(refreshToken);

      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      res.status(204).end();
    },

    async me(req, res) {
      res.json({ data: { user: await authService.getUser(req.user.id) } });
    },
  };
}
