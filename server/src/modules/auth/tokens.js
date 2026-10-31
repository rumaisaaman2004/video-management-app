import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';

// Pinning the algorithm on verify blocks "alg: none" and algorithm-confusion attacks.
const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'video-management-app';

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TOKEN_TTL,
  });
}

/** Returns `{ id, role }` from a valid access token, or throws a 401 AppError. */
export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
    });
    return { id: payload.sub, role: payload.role };
  } catch (err) {
    // A distinct code tells the client to refresh silently instead of logging the user out.
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired');
    }
    throw AppError.unauthorized('Invalid access token');
  }
}

// 32 random bytes encoded as base64url are always 43 characters.
const REFRESH_TOKEN_PATTERN = /^[\w-]{43}$/;

/** Opaque random token. Only its hash is stored, so a database leak cannot be replayed. */
export function generateRefreshToken() {
  return randomBytes(32).toString('base64url');
}

/** Rejects cookies that cannot be a refresh token (e.g. JSON-parsed "j:" cookies). */
export function isWellFormedRefreshToken(value) {
  return typeof value === 'string' && REFRESH_TOKEN_PATTERN.test(value);
}

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
