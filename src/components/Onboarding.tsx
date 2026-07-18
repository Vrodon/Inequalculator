import { useLayoutEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '../state/useOnboarding';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * First-visit onboarding. Opens with a centered welcome modal (why the site
 * exists + a "take a tour?" choice); the tour then spotlights the country
 * switch, rate sliders, year scrubber, the Gini tile and the wealth-tax panel
 * in turn (each tagged with `data-tour`). Shown once, then never again.
 */
export function Onboarding() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { showWelcome, showTour, step, stepId, total, startTour, dismiss, next, back, skip } =
    useOnboarding();
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    if (!showTour) return;

    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${stepId}"]`);
      if (!el) {
        setBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const el = document.querySelector<HTMLElement>(`[data-tour="${stepId}"]`);
    if (el) el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });

    const timer = window.setTimeout(measure, prefersReduced ? 0 : 280);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [showTour, stepId, prefersReduced]);

  if (showWelcome) {
    return createPortal(
      <div
        className="fixed inset-0 z-[95] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={t('onboarding.welcome.title')}
      >
        <div className="absolute inset-0 bg-black/60" onClick={dismiss} />
        <motion.div
          className="card relative z-10 w-full max-w-sm p-6 shadow-pop"
          initial={prefersReduced ? false : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22 }}
        >
          <h2 className="text-lg font-bold leading-snug text-text">{t('onboarding.welcome.title')}</h2>
          <p className="mt-1 text-sm font-medium text-muted">{t('onboarding.welcome.subtitle')}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t('onboarding.welcome.body')}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={startTour}
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110"
            >
              {t('onboarding.welcome.start')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:text-text"
            >
              {t('onboarding.welcome.dismiss')}
            </button>
          </div>
        </motion.div>
      </div>,
      document.body,
    );
  }

  if (!showTour) return null;

  const copy = {
    title: t(`onboarding.${stepId}.title`),
    body: t(`onboarding.${stepId}.body`),
  };

  const PAD = 8;
  const spot = box
    ? {
        top: box.top - PAD,
        left: box.left - PAD,
        width: box.width + PAD * 2,
        height: box.height + PAD * 2,
      }
    : null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(340, vw - 24);
  let cardStyle: CSSProperties;
  if (spot) {
    const center = spot.left + spot.width / 2;
    const left = Math.min(Math.max(center - cardW / 2, 12), vw - cardW - 12);
    const below = spot.top + spot.height < vh * 0.62;
    cardStyle = below
      ? { width: cardW, top: spot.top + spot.height + 12, left }
      : { width: cardW, top: spot.top - 12, left, transform: 'translateY(-100%)' };
  } else {
    cardStyle = { width: cardW, left: (vw - cardW) / 2, top: vh * 0.4 };
  }

  const isLast = step + 1 >= total;

  return createPortal(
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={copy.title}>
      {/* backdrop; clicking anywhere outside the card advances */}
      <div className="absolute inset-0" onClick={next} />

      {spot && (
        <>
          <div
            className="pointer-events-none absolute rounded-2xl"
            style={{
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
              boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.62)',
            }}
          />
          <motion.div
            className="pointer-events-none absolute rounded-2xl ring-2 ring-accent"
            style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
            animate={prefersReduced ? undefined : { opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      <motion.div
        className="card absolute p-4 shadow-pop"
        style={cardStyle}
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="tnum text-xs font-semibold text-accent">
          {t('onboarding.stepOf', { current: step + 1, total })}
        </p>
        <h3 className="mt-1 text-base font-semibold text-text">{copy.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{copy.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            className="text-sm font-medium text-muted transition hover:text-text"
          >
            {t('onboarding.skip')}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-text"
              >
                {t('onboarding.back')}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg transition hover:brightness-110"
            >
              {isLast ? t('onboarding.done') : t('onboarding.next')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
