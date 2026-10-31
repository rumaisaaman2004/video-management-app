/**
 * Turns an ApiError's validation details into `{ fieldName: message }` for a form.
 * The server reports fields as "body.email"; forms only need "email".
 * The first message per field wins.
 */
export function fieldErrorsFromApiError(error) {
  const fieldErrors = {};
  for (const { field, message } of error?.details ?? []) {
    const name = field.replace(/^body\./, '');
    fieldErrors[name] ??= message;
  }
  return fieldErrors;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/** Quick checks that mirror the server's rules, so mistakes show before a round trip. */
export const validators = {
  required: (label) => (value) => (value.trim() ? null : `${label} is required`),
  email: (value) => {
    if (!value.trim()) return 'Email is required';
    return EMAIL_PATTERN.test(value.trim()) ? null : 'Enter a valid email address';
  },
  newPassword: (value) =>
    value.length >= MIN_PASSWORD_LENGTH
      ? null
      : `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
};

/** Runs `{ field: validator }` over `values`; returns only the fields that failed. */
export function validateFields(values, rules) {
  const errors = {};
  for (const [field, validate] of Object.entries(rules)) {
    const message = validate(values[field] ?? '');
    if (message) errors[field] = message;
  }
  return errors;
}
