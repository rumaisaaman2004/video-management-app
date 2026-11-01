import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

// Prefix keeps these signatures distinct from anything else signed with the same secret.
const SIGNATURE_PURPOSE = 'media-url';

function computeSignature(path, expires) {
  return createHmac('sha256', env.JWT_SECRET)
    .update(`${SIGNATURE_PURPOSE}:${path}:${expires}`)
    .digest('base64url');
}

/**
 * Appends an expiring HMAC signature to a URL path. Used for media that needs
 * access control but is loaded by <video>/<img> tags, which cannot send an
 * Authorization header.
 */
export function signPath(path, ttlSeconds) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${path}?expires=${expires}&signature=${computeSignature(path, expires)}`;
}

/** True when `signature` is valid for `path` and has not expired. */
export function isValidSignature(path, { expires, signature }) {
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt < Date.now() / 1000) return false;
  if (typeof signature !== 'string') return false;

  const expected = Buffer.from(computeSignature(path, expiresAt));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
