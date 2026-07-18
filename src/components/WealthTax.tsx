import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useSimulation } from '../state/store';
import { TAX_PRESETS } from '../data/groupPresets';
import type { RedistributionTarget } from '../model/wealthModel';
import { formatCountCompact, formatCurrencyCompact, formatRate } from '../lib/format';
import { handleRovingKeys } from '../lib/a11y';
import { RangeSlider } from './primitives/RangeSlider';
import { InfoDot } from './primitives/InfoDot';
import { ChevronDownIcon } from './icons';

const THRESHOLD_STEPS = [500e3, 1e6, 2e6, 5e6, 10e6, 20e6, 50e6, 100e6];
const REDIST: RedistributionTarget[] = ['bottom50', 'bottom90', 'all', 'none'];

/**
 * The "What could change this?" section: pick a wealth-tax design (a real-world
 * preset or a custom flat/threshold tax) and watch it bend the curve.
 */
export function WealthTax({ onOpenCaveats }: { onOpenCaveats: () => void }) {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const {
    taxSelection,
    setTaxSelection,
    customTax,
    setCustomTax,
    redistribution,
    setRedistribution,
    taxActive,
    stats,
    householdsTaxed,
    currencySymbol,
  } = useSimulation();
  const [open, setOpen] = useState(true);

  const selectedPreset = TAX_PRESETS.find((p) => p.id === taxSelection);
  const stepIndex = THRESHOLD_STEPS.reduce(
    (best, s, i) =>
      Math.abs(s - customTax.threshold) < Math.abs(THRESHOLD_STEPS[best] - customTax.threshold) ? i : best,
    0,
  );

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div>
          <h2 className="text-base font-semibold text-text">{t('tax.title')}</h2>
          <p className="mt-0.5 text-sm text-muted">{t('tax.subtitle')}</p>
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
            <div className="space-y-4 px-5 pb-5">
              {/* design picker */}
              <div>
                <span className="mb-2 block text-sm font-medium text-muted">{t('tax.design')}</span>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="radiogroup"
                  aria-label={t('tax.design')}
                  onKeyDown={handleRovingKeys}
                >
                  {TAX_PRESETS.map((p) => (
                    <TaxPill
                      key={p.id}
                      active={taxSelection === p.id}
                      label={t(p.nameKey)}
                      onClick={() => setTaxSelection(p.id)}
                    />
                  ))}
                  <TaxPill
                    active={taxSelection === 'custom'}
                    label={t('tax.custom')}
                    onClick={() => setTaxSelection('custom')}
                  />
                </div>
              </div>

              {/* selected preset description, or custom controls */}
              {taxSelection === 'custom' ? (
                <div className="space-y-4 rounded-control border border-line bg-surface-2/50 p-4">
                  <div
                    className="flex gap-1.5"
                    role="radiogroup"
                    aria-label={t('tax.style')}
                    onKeyDown={handleRovingKeys}
                  >
                    <TaxPill
                      active={customTax.style === 'flatOnGroups'}
                      label={t('tax.styleFlat')}
                      onClick={() => setCustomTax({ style: 'flatOnGroups' })}
                    />
                    <TaxPill
                      active={customTax.style === 'marginal'}
                      label={t('tax.styleThreshold')}
                      onClick={() => setCustomTax({ style: 'marginal' })}
                    />
                  </div>
                  <RangeSlider
                    label={t('tax.rate')}
                    value={customTax.rate}
                    min={0}
                    max={5}
                    step={0.25}
                    onChange={(v) => setCustomTax({ rate: v })}
                    formatValue={(v) => (v === 0 ? t('tax.off') : `${formatRate(v, 2)}${t('tax.perYear')}`)}
                  />
                  {customTax.style === 'marginal' && (
                    <div className="space-y-2">
                      <RangeSlider
                        label={t('tax.threshold')}
                        value={stepIndex}
                        min={0}
                        max={THRESHOLD_STEPS.length - 1}
                        step={1}
                        onChange={(i) => setCustomTax({ threshold: THRESHOLD_STEPS[Math.round(i)] })}
                        formatValue={(i) =>
                          formatCurrencyCompact(THRESHOLD_STEPS[Math.round(i)], currencySymbol)
                        }
                      />
                      <p className="text-xs leading-relaxed text-faint">{t('tax.thresholdNote')}</p>
                    </div>
                  )}
                </div>
              ) : (
                selectedPreset && (
                  <div className="flex items-start gap-1.5 rounded-control border border-line bg-surface-2/50 p-3">
                    <p className="text-sm leading-relaxed text-muted">{t(selectedPreset.descKey)}</p>
                    {selectedPreset.source && (
                      <InfoDot title={t(selectedPreset.nameKey)} source={selectedPreset.source} placement="end" />
                    )}
                  </div>
                )
              )}

              {/* redistribution + live readout (only when a tax is active) */}
              {taxActive && (
                <>
                  <div>
                    <div className="mb-2 flex items-center gap-0.5">
                      <span className="text-sm font-medium text-muted">{t('tax.redistribute')}</span>
                      <InfoDot title={t('tax.redistribute')} note={t('tax.redistributeHelp')} />
                    </div>
                    <div
                      role="radiogroup"
                      aria-label={t('tax.redistribute')}
                      onKeyDown={handleRovingKeys}
                      className="grid grid-cols-4 gap-1 rounded-control border border-line bg-surface p-1"
                    >
                      {REDIST.map((r) => (
                        <button
                          key={r}
                          type="button"
                          role="radio"
                          aria-checked={redistribution === r}
                          tabIndex={redistribution === r ? 0 : -1}
                          onClick={() => setRedistribution(r)}
                          className={clsx(
                            'rounded-[0.55rem] px-1 py-1.5 text-xs font-semibold transition',
                            redistribution === r
                              ? 'bg-surface-2 text-text ring-1 ring-line'
                              : 'text-muted hover:text-text',
                          )}
                        >
                          {t(`tax.redist.${r}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-control bg-surface-2/60 px-4 py-3">
                    <Readout label={t('tax.revenue')} value={formatCurrencyCompact(stats.taxThisYear, currencySymbol)} />
                    <div className="h-8 w-px bg-line" />
                    <Readout label={t('tax.affected')} value={formatCountCompact(householdsTaxed)} />
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={onOpenCaveats}
                className="text-sm font-medium text-accent underline-offset-2 hover:underline"
              >
                {t('tax.caveatLink')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TaxPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-accent bg-accent/10 text-text'
          : 'border-line text-muted hover:border-muted hover:text-text',
      )}
    >
      {label}
    </button>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="tnum text-lg font-bold text-text">{value}</p>
    </div>
  );
}
