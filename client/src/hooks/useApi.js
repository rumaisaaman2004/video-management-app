import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data for a component: `const { data, error, isLoading, reload } =
 * useApi((signal) => api.get('/videos', { signal }), [page])`.
 *
 * The request re-runs when a value in `deps` changes (they must be plain values:
 * strings, numbers, booleans). Outdated requests are cancelled, so a slow
 * response can never overwrite a newer one. While reloading, the previous
 * `data` stays available so the page does not flash empty.
 */
export function useApi(request, deps) {
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = JSON.stringify([...deps, reloadCount]);
  const [result, setResult] = useState({ key: null, data: undefined, error: null });

  // Always call the latest `request` without making it a dependency.
  const requestRef = useRef(request);
  useEffect(() => {
    requestRef.current = request;
  });

  useEffect(() => {
    const controller = new AbortController();

    requestRef.current(controller.signal).then(
      (data) => setResult({ key: requestKey, data, error: null }),
      (error) => {
        if (!controller.signal.aborted) {
          setResult((previous) => ({ key: requestKey, data: previous.data, error }));
        }
      },
    );

    return () => controller.abort();
  }, [requestKey]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const isCurrent = result.key === requestKey;

  return {
    data: result.data,
    error: isCurrent ? result.error : null,
    isLoading: !isCurrent,
    reload,
  };
}
