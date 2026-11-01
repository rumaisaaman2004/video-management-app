import { AppError } from '../errors/AppError.js';

const REQUEST_LOCATIONS = ['params', 'query', 'body'];

/**
 * Validates request input against zod schemas, e.g.
 * `validate({ params: idParamsSchema, body: createVideoSchema })`.
 *
 * Parsed (coerced, defaulted) values are exposed on `req.validated`, because
 * Express 5 does not allow `req.query` to be reassigned.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const validated = {};
    const issues = [];

    for (const location of REQUEST_LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);
      if (result.success) {
        validated[location] = result.data;
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            field: [location, ...issue.path].join('.'),
            message: issue.message,
          })),
        );
      }
    }

    if (issues.length > 0) {
      return next(AppError.validation(issues));
    }

    req.validated = validated;
    next();
  };
}
