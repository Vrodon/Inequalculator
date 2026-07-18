import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'ineq-theme';

function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.classList.remove('dark', 'light');
  el.classList.add(theme);
}

function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  // Fall back to whatever the pre-paint inline script decided (default dark).
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
    return 'light';
  }
  return 'dark';
}

/** Theme state that persists to localStorage and toggles the class on <html>. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Keep the DOM in sync if the value ever changes from elsewhere.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme, setTheme, toggle };
}
