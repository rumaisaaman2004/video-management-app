import { randomBytes, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../errors/AppError.js';
import { isUniqueViolation } from '../../errors/databaseErrors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { createUsersRepository } from '../users/users.repository.js';
import { createRefreshTokensRepository } from './refreshTokens.repository.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from './tokens.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createAuthService({ pool }) {
  const users = createUsersRepository(pool);

  // Checked when an email is unknown, so login takes the same time either way
  // and response timing does not reveal which emails are registered.
  const dummyPasswordHash = hashPassword(randomBytes(16).toString('hex'));

  /**
   * Issues a new access token and stores a new refresh token for the user.
   * A new login starts a new token family; a refresh continues the existing one.
   */
  async function startSession(db, user, familyId = randomUUID()) {
    const refreshTokens = createRefreshTokensRepository(db);
    const refreshToken = generateRefreshToken();

    await refreshTokens.deleteExpiredForUser(user.id);
    await refreshTokens.create({
      userId: user.id,
      familyId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
    });

    return { user, accessToken: signAccessToken(user), refreshToken };
  }

  return {
    async register({ name, email, password }) {
      const passwordHash = await hashPassword(password);

      let user;
      try {
        user = await users.create({ name, email, passwordHash });
      } catch (err) {
        if (isUniqueViolation(err)) throw AppError.conflict('Email is already registered');
        throw err;
      }

      return startSession(pool, user);
    },

    async login({ email, password }) {
      const account = await users.findWithPasswordHashByEmail(email);
      const isPasswordValid = await verifyPassword(
        password,
        account?.passwordHash ?? (await dummyPasswordHash),
      );

      if (!account || !isPasswordValid) {
        throw AppError.unauthorized('Invalid email or password');
      }

      return startSession(pool, account.user);
    },

    /** Exchanges a refresh token for a new session; the old token stops working. */
    async refresh(refreshToken) {
      // Returns null instead of throwing for rejected tokens, so that revoking a
      // reused token's family is committed rather than rolled back.
      const session = await withTransaction(pool, async (client) => {
        const refreshTokens = createRefreshTokensRepository(client);
        const stored = await refreshTokens.findByHashForUpdate(hashRefreshToken(refreshToken));

        if (!stored || stored.isExpired) return null;

        if (stored.isUsed) {
          // An already-exchanged token was presented again: it was likely stolen,
          // so end every session that came from the same login.
          if (!stored.isWithinReuseGracePeriod) await refreshTokens.deleteFamily(stored.familyId);
          return null;
        }

        const user = await createUsersRepository(client).findById(stored.userId);
        if (!user) return null;

        await refreshTokens.markUsed(stored.id);
        return startSession(client, user, stored.familyId);
      });

      if (!session) throw AppError.unauthorized('Session has expired, please log in again');
      return session;
    },

    async logout(refreshToken) {
      await createRefreshTokensRepository(pool).deleteFamilyByTokenHash(
        hashRefreshToken(refreshToken),
      );
    },

    async getUser(userId) {
      const user = await users.findById(userId);
      if (!user) throw AppError.notFound('User not found');
      return user;
    },
  };
}
