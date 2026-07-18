import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';

/**
 * i18n is wired up and ready for more languages (German is the planned first
 * addition). The app ships English-only: every user-facing string lives in
 * en.json so a translator can add a locale without touching components.
 */
export const resources = {
  en: { translation: en },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'translation',
  interpolation: { escapeValue: false }, // React already escapes.
  returnNull: false,
  // Resources are bundled and init is synchronous, so we don't need Suspense.
  react: { useSuspense: false },
});

export default i18n;
