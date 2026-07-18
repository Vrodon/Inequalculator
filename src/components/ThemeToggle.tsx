import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../state/useTheme';
import { MoonIcon, SunIcon } from './icons';

/** A small button that toggles and persists the light / dark theme. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const prefersReduced = useReducedMotion();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t('header.themeToLight') : t('header.themeToDark')}
      title={t('header.theme')}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:text-text"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={prefersReduced ? false : { rotate: -40, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={prefersReduced ? { opacity: 0 } : { rotate: 40, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.18 }}
          className="inline-flex"
        >
          {isDark ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
