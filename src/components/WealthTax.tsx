import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useSimulation } from '../state/store';
import {
  FLAT_STANDARDS,
  THRESHOLD_STANDARDS,
  PROGRESSIVE_STANDARDS,
  progressiveBrackets,
  type TaxType,
} from '../data/groupPresets';
import type { RedistributionTarget } from '../model/wealthModel';
import { formatCountCompact, formatCurrencyCompact, formatRate } from '../lib/format';
import { handleRovingKeys } from '../lib/a11y';
import { RangeSlider } from './primitives/RangeSlider';
import { InfoDot } from './primitives/InfoDot';
import { ChevronDownIcon } from './icons';

const THRESHOLD_STEPS = [100e3, 250e3, 500e3, 1e6, 2e6, 5e6, 10e6, 20e6, 50e6, 100e6];
const TAX_TYPES: TaxType[] = ['none', 'flat', 'threshold', 'progressive'];
const REDIST: RedistributionTarget[] = ['bottom50', 'bottom90', 'all', 'none'];

const nearestStep = (v: number) =>
  THRESHOLD_STEPS.reduce(
    (best, s, i) => (Math.abs(s - v) < Math.abs(THRESHOLD_STEPS[best] - v) ? i : best),
    0,
  );

/**
 * The wealth-tax panel. The user first picks a tax *type* (none / flat /
 * threshold / progressive), then a real-world *standard* within that type, then
 * fine-tunes with sliders. Choosing a standard fills the sliders; nudging a
 * slider simply means the design no longer matches a standard.
 */
export function WealthTax({ onOpenCaveats }: { onOpenCaveats: () => void }) {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const {
    taxType,
    setTaxType,
    flatTax,
    setFlatTax,
    thresholdTax,
    setThresholdTax,
    progressiveTax,
    setProgressiveTax,
    redistribution,
    setRedistribution,
    taxActive,
    stats,
    householdsTaxed,
    currencySymbol,
  } = useSimulation();
  const [open, setOpen] = useState(true);

  const rateFmt = (v: number) => (v === 0 ? t('tax.off') : `${formatRate(v, 2)}${t('tax.perYear')}`);
  const money = (v: number) => formatCurrencyCompact(v, currencySymbol);

  const bands = progressiveBrackets(progressiveTax.presetId, progressiveTax.scale)
    .map((b) => t('tax.band', { rate: formatRate(b.rate, 1), threshold: money(b.threshold) }))
    .join(' · ');

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
              {/* 1) type selector */}
              <Field label={t('tax.type')}>
                <div
                  role="radiogroup"
                  aria-label={t('tax.type')}
                  onKeyDown={handleRovingKeys}
                  className="grid grid-cols-4 gap-1 rounded-control border border-line bg-surface p-1"
                >
                  {TAX_TYPES.map((ty) => (
                    <button
                      key={ty}
                      type="button"
                      role="radio"
                      aria-checked={taxType === ty}
                      tabIndex={taxType === ty ? 0 : -1}
                      onClick={() => setTaxType(ty)}
                      className={clsx(
                        'rounded-[0.55rem] px-1 py-2 text-xs font-semibold transition',
                        taxType === ty
                          ? 'bg-accent/15 text-text ring-1 ring-accent/40'
                          : 'text-muted hover:text-text',
                      )}
                    >
                      {t(`taxType.${ty}`)}
                    </button>
                  ))}
                </div>
              </Field>

              {/* 2) type-specific standards + sliders */}
              {taxType === 'none' && (
                <p className="rounded-control border border-line bg-surface-2/50 p-3 text-sm leading-relaxed text-muted">
                  {t('tax.noneNote')}
                </p>
              )}

              {taxType === 'flat' && (
                <div className="space-y-4 rounded-control border border-line bg-surface-2/50 p-4">
                  <Standards label={t('tax.standard')}>
                    {FLAT_STANDARDS.map((s) => (
                      <TaxPill
                        key={s.id}
                        active={flatTax.rate === s.rate && flatTax.scope === s.scope}
                        label={t(s.labelKey)}
                        onClick={() => setFlatTax({ rate: s.rate, scope: s.scope })}
                      />
                    ))}
                  </Standards>
                  <RangeSlider
                    label={t('tax.rate')}
                    value={flatTax.rate}
                    min={0}
                    max={5}
                    step={0.25}
                    onChange={(v) => setFlatTax({ rate: v })}
                    formatValue={rateFmt}
                  />
                  <Field label={t('tax.appliesTo')}>
                    <div
                      role="radiogroup"
                      aria-label={t('tax.appliesTo')}
                      onKeyDown={handleRovingKeys}
                      className="flex gap-1.5"
                    >
                      <TaxPill
                        active={flatTax.scope === 'top1'}
                        label={t('groups.top1')}
                        onClick={() => setFlatTax({ scope: 'top1' })}
                      />
                      <TaxPill
                        active={flatTax.scope === 'top10'}
                        label={t('groups.top10')}
                        onClick={() => setFlatTax({ scope: 'top10' })}
                      />
                    </div>
                  </Field>
                </div>
              )}

              {taxType === 'threshold' && (
                <div className="space-y-4 rounded-control border border-line bg-surface-2/50 p-4">
                  <Standards label={t('tax.standard')}>
                    {THRESHOLD_STANDARDS.map((s) => (
                      <TaxPill
                        key={s.id}
                        active={thresholdTax.rate === s.rate && thresholdTax.threshold === s.threshold}
                        label={t(s.labelKey)}
                        onClick={() => setThresholdTax({ rate: s.rate, threshold: s.threshold })}
                      />
                    ))}
                  </Standards>
                  <RangeSlider
                    label={t('tax.rate')}
                    value={thresholdTax.rate}
                    min={0}
                    max={5}
                    step={0.25}
                    onChange={(v) => setThresholdTax({ rate: v })}
                    formatValue={rateFmt}
                  />
                  <div className="space-y-2">
                    <RangeSlider
                      label={t('tax.appliesAbove')}
                      value={nearestStep(thresholdTax.threshold)}
                      min={0}
                      max={THRESHOLD_STEPS.length - 1}
                      step={1}
                      onChange={(i) => setThresholdTax({ threshold: THRESHOLD_STEPS[Math.round(i)] })}
                      formatValue={(i) => money(THRESHOLD_STEPS[Math.round(i)])}
                    />
                    <p className="text-xs leading-relaxed text-faint">{t('tax.thresholdNote')}</p>
                  </div>
                </div>
              )}

              {taxType === 'progressive' && (
                <div className="space-y-4 rounded-control border border-line bg-surface-2/50 p-4">
                  <Standards label={t('tax.standard')}>
                    {PROGRESSIVE_STANDARDS.map((s) => (
                      <TaxPill
                        key={s.id}
                        active={progressiveTax.presetId === s.id}
                        label={t(s.labelKey)}
                        onClick={() => setProgressiveTax({ presetId: s.id, scale: 1 })}
                      />
                    ))}
                  </Standards>
                  <RangeSlider
                    label={t('tax.overallRate')}
                    value={progressiveTax.scale}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={(v) => setProgressiveTax({ scale: v })}
                    formatValue={(v) => `×${v.toFixed(1)}`}
                  />
                  <p className="text-xs leading-relaxed text-faint">{bands}</p>
                </div>
              )}

              {/* 3) redistribution + live readout (only when a tax is active) */}
              {taxActive && (
                <>
                  <Field
                    label={t('tax.redistribute')}
                    hint={<InfoDot title={t('tax.redistribute')} note={t('tax.redistributeHelp')} />}
                  >
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
                  </Field>

                  <div className="flex items-center justify-between gap-3 rounded-control bg-surface-2/60 px-4 py-3">
                    <Readout label={t('tax.revenue')} value={money(stats.taxThisYear)} />
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

/** A labeled block: a small muted label (optionally with a hint) above its content. */
function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-0.5">
        <span className="text-sm font-medium text-muted">{label}</span>
        {hint}
      </div>
      {children}
    </div>
  );
}

/** The "Standard" label with its wrapping pill row. */
function Standards({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label} onKeyDown={handleRovingKeys}>
        {children}
      </div>
    </div>
  );
}

function TaxPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
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
