import { describe, expect, it } from 'vitest';
import { fromDatabaseError } from '../../src/errors/databaseErrors.js';

describe('fromDatabaseError', () => {
  it.each([
    ['unique violation', { code: '23505' }, 409],
    [
      'delete of a still-referenced row',
      { code: '23503', detail: 'Key (id)=(1) is still referenced from table "videos".' },
      409,
    ],
    [
      'insert with a missing reference',
      { code: '23503', detail: 'Key (category_id)=(1) is not present in table "categories".' },
      400,
    ],
    ['check violation', { code: '23514' }, 400],
    ['not-null violation', { code: '23502' }, 400],
    ['malformed uuid', { code: '22P02' }, 400],
  ])('maps a %s to %i', (_label, pgError, expectedStatus) => {
    expect(fromDatabaseError(pgError).statusCode).toBe(expectedStatus);
  });

  it('returns null for errors that are not known Postgres errors', () => {
    expect(fromDatabaseError(new Error('boom'))).toBeNull();
  });
});
