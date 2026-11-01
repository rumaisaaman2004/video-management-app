import { useState } from 'react';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { fieldErrorsFromApiError, validateFields } from '../../lib/formErrors.js';

/**
 * Form state shared by the sign-in and registration pages: values, client-side
 * checks before submitting, and server errors mapped onto fields.
 *
 * `validate(values)` returns `{ field: message }` for problems found locally.
 * `toFieldErrors(error)` can map extra server errors (e.g. 409) to fields.
 */
export function useAuthForm({ initialValues, rules, extraChecks, action, toFieldErrors }) {
  const [values, setValues] = useState(initialValues);
  const [clientErrors, setClientErrors] = useState({});
  const { run, isRunning, error } = useAsyncAction(action);

  const serverFieldErrors = { ...fieldErrorsFromApiError(error), ...toFieldErrors?.(error) };
  const fieldErrors = { ...serverFieldErrors, ...clientErrors };
  // Errors that belong to no single field (wrong password, rate limit, network) go in an alert.
  const formError = error && Object.keys(serverFieldErrors).length === 0 ? error.message : null;

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setClientErrors(({ [name]: _cleared, ...rest }) => rest);
  }

  /** Validates, then runs the action. Resolves with its result, or undefined on failure. */
  async function submit() {
    const errors = { ...validateFields(values, rules), ...extraChecks?.(values) };
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return undefined;
    return run(values);
  }

  return { values, fieldErrors, formError, isSubmitting: isRunning, handleChange, submit };
}
