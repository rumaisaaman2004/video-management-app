import { AppError } from '../errors/AppError.js';
import { fromDatabaseError } from '../errors/databaseErrors.js';

function toAppError(err) {
  if (err instanceof AppError) return err;

  const databaseError = fromDatabaseError(err);
  if (databaseError) return databaseError;

  // Raised by express.json() for malformed or oversized request bodies.
  if (err.type === 'entity.parse.failed') {
    return AppError.badRequest('Request body contains invalid JSON');
  }
  if (err.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
}

/**
 * Single place that turns errors into JSON responses:
 * `{ error: { code, message, details? } }`.
 */
export function errorHandler(err, req, res, next) {
  // Express must close the connection itself if the response already started.
  if (res.headersSent) return next(err);

  const appError = toAppError(err);
  const isServerError = appError.statusCode >= 500;

  // The request logger includes res.err (with stack trace) in the request's log line.
  if (isServerError) {
    res.err = err;
  }

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details && { details: appError.details }),
      // Lets users quote an ID that support can match against the server logs.
      ...(isServerError && { requestId: req.id }),
    },
  });
}
