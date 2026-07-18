import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import { formatRate } from '../lib/format';
import { RangeSlider } from './primitives/RangeSlider';
import { ChevronDownIcon } from './icons';

/**
 * The "What could change this?" section: an annual wealth-tax lever, framed
 * neutrally. Open by default in the simple view; caveats live in the info panel.
 */
export function WhatCouldChange({ onOpenCaveats }: { onOpenCaveats: () => void }) {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { params, setParam } = useSimulation();
  const [open, setOpen] = useState(true);

  const taxValue = (v: number) => (v === 0 ? t('change.off') : `${formatRate(v, 2)}/yr`);

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div>
          <h2 className="text-base font-semibold text-text">{t('change.title')}</h2>
          <p className="mt-0.5 text-sm text-muted">{t('change.subtitle')}</p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.2 }}
          className="shrink-0 text-muted"
        >
          <ChevronDownIcon />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReduced ? { duration: 0 } : { duration: 0.24, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-5 pb-5">
              <RangeSlider
                label={t('change.wealthTax')}
                value={params.wealthTax}
                min={0}
                max={3}
                step={0.25}
                onChange={(v) => setParam('wealthTax', v)}
                formatValue={taxValue}
                help={t('change.wealthTaxHelp')}
              />
              <button
                type="button"
                onClick={onOpenCaveats}
                className="text-sm font-medium text-accent underline-offset-2 hover:underline"
              >
                {t('change.caveatLink')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
