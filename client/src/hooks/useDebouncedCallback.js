import { useCallback, useEffect, useRef } from 'react';

/**
 * Delays a callback until calls stop for `delayMs`, e.g. searching once typing pauses.
 * Returns `{ call, cancel }`; a pending call is also cancelled on unmount.
 */
export function useDebouncedCallback(callback, delayMs) {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);

  // Always run the latest callback without restarting the timer when it changes.
  useEffect(() => {
    callbackRef.current = callback;
  });

  const cancel = useCallback(() => clearTimeout(timerRef.current), []);
  useEffect(() => cancel, [cancel]);

  const call = useCallback(
    (...args) => {
      cancel();
      timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [cancel, delayMs],
  );

  return { call, cancel };
}
