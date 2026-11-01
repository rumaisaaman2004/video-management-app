import { AppError } from '../../errors/AppError.js';
import { verifyAccessToken } from './tokens.js';

/** Requires a valid `Authorization: Bearer <token>` header and sets `req.user = { id, role }`. */
export function authenticate(req, _res, next) {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];

  // The auth scheme name is case-insensitive (RFC 9110).
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return next(AppError.unauthorized());
  }

  req.user = verifyAccessToken(token);
  next();
}

/**
 * Like `authenticate`, but lets anonymous requests through (req.user stays undefined).
 * A token that is present must still be valid.
 */
export function optionalAuthenticate(req, res, next) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
}

/** Allows only the given roles. Must run after `authenticate`. */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
