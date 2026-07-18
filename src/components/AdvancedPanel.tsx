import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { RangeSlider } from './primitives/RangeSlider';
import { Dialog } from './primitives/Dialog';
import { SlidersIcon } from './icons';

const pctValue = (v: number) => `${Math.round(v * 10) / 10}%`;

/** The extra sliders revealed in the Advanced view. */
function AdvancedControls() {
  const { t } = useTranslation();
  const { shares, setShare } = useSimulation();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-text">{t('advanced.startingHeading')}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{t('advanced.startingHelp')}</p>
      </div>
      <RangeSlider
        label={t('advanced.shareTop1')}
        value={shares.top1}
        min={0}
        max={60}
        step={0.5}
        onChange={(v) => setShare('top1', v)}
        formatValue={pctValue}
      />
      <RangeSlider
        label={t('advanced.shareNext9')}
        value={shares.next9}
        min={0}
        max={50}
        step={0.5}
        onChange={(v) => setShare('next9', v)}
        formatValue={pctValue}
      />
      <RangeSlider
        label={t('advanced.shareBottom50')}
        value={shares.bottom50}
        min={0}
        max={30}
        step={0.5}
        onChange={(v) => setShare('bottom50', v)}
        formatValue={pctValue}
      />
      <div className="flex items-center justify-between rounded-control bg-surface-2/60 px-4 py-2.5">
        <span className="text-sm text-muted">{t('advanced.shareMiddle40')}</span>
        <span className="tnum text-sm font-semibold text-text">{pctValue(shares.middle40)}</span>
      </div>

      <p className="rounded-control border border-line bg-surface-2/50 px-3 py-2.5 text-xs leading-relaxed text-muted">
        {t('advanced.returnsNote')}
      </p>
    </div>
  );
}

/** The Advanced toggle plus its content — an inline card on desktop, a sheet on mobile. */
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
