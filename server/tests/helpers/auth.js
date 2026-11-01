import { randomUUID } from 'node:crypto';
import { signAccessToken } from '../../src/modules/auth/tokens.js';

/**
 * Authorization header value for a user with the given role. Access tokens are
 * stateless, so no database row is needed unless the route loads the user.
 */
export function bearerToken(role = 'user', id = randomUUID()) {
  return `Bearer ${signAccessToken({ id, role })}`;
}
