import { useCallback, useState } from 'react';

/**
 * A tiny localStorage-backed state hook. Reads once on mount and writes on every
 * update. Fails silently if storage is unavailable (e.g. private mode).
 */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore write errors */
        }
        return next;
      });
    },
    [key],
  );

  return [state, set];
}
