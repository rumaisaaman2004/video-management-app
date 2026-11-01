import { useCallback, useState } from 'react';

/**
 * Tracks a user-triggered async action such as submitting a form:
 * `const { run, isRunning, error, reset } = useAsyncAction(saveVideo)`.
 *
 * `run(...args)` resolves with the action's result, or with undefined if it
 * failed; the failure is kept in `error` for the UI to display.
 */
export function useAsyncAction(action) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setIsRunning(true);
      setError(null);
      try {
        return await action(...args);
      } catch (err) {
        setError(err);
        return undefined;
      } finally {
        setIsRunning(false);
      }
    },
    [action],
  );

  const reset = useCallback(() => setError(null), []);

  return { run, isRunning, error, reset };
}
