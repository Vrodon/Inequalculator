import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatRate } from '../lib/format';
import { RangeSlider } from './primitives/RangeSlider';
import { Dialog } from './primitives/Dialog';
import { SlidersIcon } from './icons';

/** The extra sliders revealed in the Advanced view. */
function AdvancedControls() {
  const { t } = useTranslation();
  const { params, setParam } = useSimulation();

  return (
    <div className="space-y-5">
      <RangeSlider
        label={t('advanced.startingDistribution')}
        value={params.topInitialWealthShare}
        min={40}
        max={80}
        step={1}
        onChange={(v) => setParam('topInitialWealthShare', v)}
        formatValue={(v) => `${Math.round(v)}%`}
        help={t('advanced.startingDistributionHelp')}
      />
      <RangeSlider
        label={t('advanced.extraSaving')}
        value={params.extraSaving}
        min={0}
        max={3}
        step={0.25}
        onChange={(v) => setParam('extraSaving', v)}
        formatValue={(v) => `${formatRate(v, 2)}/yr`}
        help={t('advanced.extraSavingHelp')}
      />
      <RangeSlider
        label={t('advanced.wealthTax')}
        value={params.wealthTax}
        min={0}
        max={3}
        step={0.05}
        onChange={(v) => setParam('wealthTax', v)}
        formatValue={(v) => (v === 0 ? t('change.off') : `${formatRate(v, 2)}/yr`)}
        help={t('change.wealthTaxHelp')}
      />
      <RangeSlider
        label={t('advanced.timeHorizon')}
        value={params.years}
        min={10}
        max={50}
        step={1}
        onChange={(v) => setParam('years', v)}
        formatValue={(v) => t('units.years', { count: Math.round(v) })}
        help={t('advanced.timeHorizonHelp')}
      />
    </div>
  );
}

/**
 * The Advanced toggle plus its content — an inline card on desktop, a bottom
 * sheet on mobile.
 */
export function AdvancedPanel() {
  const { t } = useTranslation();
  const { view, setView } = useSimulation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const prefersReduced = useReducedMotion();
  const open = view === 'advanced';
  const showTrigger = !(open && isDesktop);

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={() => setView(open ? 'simple' : 'advanced')}
          aria-expanded={open}
          className="card flex w-full items-center justify-center gap-2 p-4 text-sm font-semibold text-muted transition hover:text-text"
        >
          <SlidersIcon size={18} />
          {t('view.advancedOpen')}
        </button>
      )}

      {isDesktop ? (
        <AnimatePresence initial={false}>
          {open && (
            <motion.section
              key="advanced"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={prefersReduced ? { duration: 0 } : { duration: 0.24, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="card p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text">{t('advanced.title')}</h2>
                    <p className="mt-0.5 text-sm text-muted">{t('advanced.subtitle')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('simple')}
                    className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-text"
                  >
                    {t('advanced.done')}
                  </button>
                </div>
                <AdvancedControls />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      ) : (
        <Dialog open={open} onClose={() => setView('simple')} title={t('advanced.title')}>
          <p className="mb-5 text-sm text-muted">{t('advanced.subtitle')}</p>
          <AdvancedControls />
        </Dialog>
      )}
    </>
  );
}
