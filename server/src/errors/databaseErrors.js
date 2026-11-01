import { AppError } from './AppError.js';

// https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_ERROR = Object.freeze({
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  NOT_NULL_VIOLATION: '23502',
  INVALID_TEXT_REPRESENTATION: '22P02',
});

export function isUniqueViolation(err) {
  return err.code === PG_ERROR.UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(err) {
  return err.code === PG_ERROR.FOREIGN_KEY_VIOLATION;
}

/**
 * Safety net for constraint violations the service layer did not anticipate.
 * Returns an AppError for known Postgres errors, or null for anything else.
 * Messages stay generic so table and constraint names are never exposed.
 */
export function fromDatabaseError(err) {
  switch (err.code) {
    case PG_ERROR.UNIQUE_VIOLATION:
      return AppError.conflict('A record with the same value already exists');
    case PG_ERROR.FOREIGN_KEY_VIOLATION:
      return err.detail?.includes('is still referenced')
        ? AppError.conflict('This record is still in use by other records')
        : AppError.badRequest('A referenced record does not exist');
    case PG_ERROR.CHECK_VIOLATION:
    case PG_ERROR.NOT_NULL_VIOLATION:
    case PG_ERROR.INVALID_TEXT_REPRESENTATION:
      return AppError.badRequest('One or more values are invalid');
    default:
      return null;
  }
}
