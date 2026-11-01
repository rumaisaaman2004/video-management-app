import { useState } from 'react';

const STORAGE_KEY = 'color-mode';

// localStorage can throw (e.g. blocked storage in private browsing); the app must still work.
function readSavedMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

/** The saved choice, or the operating system's preference if the user never chose. */
export function getInitialColorMode() {
  return (
    readSavedMode() ??
    (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

/** Applies a mode using Bootstrap's built-in color modes. */
export function applyColorMode(mode) {
  document.documentElement.setAttribute('data-bs-theme', mode);
}

/** Current light/dark mode and a toggle that remembers the user's choice. */
export function useColorMode() {
  const [mode, setMode] = useState(
    () => document.documentElement.getAttribute('data-bs-theme') ?? getInitialColorMode(),
  );

  function toggle() {
    const next = mode === 'dark' ? 'light' : 'dark';
    applyColorMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered across visits, but the switch still works for this one.
    }
    setMode(next);
  }

  return { mode, toggle };
}
