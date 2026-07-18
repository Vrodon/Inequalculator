/**
 * App configuration.
 *
 * REPO_URL powers the "View source on GitHub" link. Set VITE_REPO_URL in a
 * .env file (or leave the default and update it after creating the repo).
 */
export const REPO_URL =
  (import.meta.env.VITE_REPO_URL as string | undefined) ??
  'https://github.com/your-username/inequalculator';
