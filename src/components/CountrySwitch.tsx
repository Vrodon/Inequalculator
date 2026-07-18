import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { GROUP_PRESETS, type GroupPresetId } from '../data/groupPresets';
import { useSimulation } from '../state/store';
import { handleRovingKeys } from '../lib/a11y';
import { InfoDot } from './primitives/InfoDot';

const ORDER: (GroupPresetId | 'custom')[] = ['US', 'UK', 'DE', 'custom'];

/** Segmented control to load a country preset (or switch to Custom). */
export function CountrySwitch() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { presetLabel, selectCountry, markCustom } = useSimulation();

  return (
    <div data-tour="country">
      <div className="mb-2 flex items-center gap-0.5">
        <span className="text-sm font-medium text-muted">{t('country.label')}</span>
        <InfoDot title={t('country.label')} note={t('country.help')} />
      </div>
      <div
        role="radiogroup"
        aria-label={t('country.label')}
        onKeyDown={handleRovingKeys}
        className="grid grid-cols-4 gap-1 rounded-control border border-line bg-surface p-1"
      >
        {ORDER.map((id) => {
          const active = presetLabel === id;
          const flag = id === 'custom' ? '🎛️' : GROUP_PRESETS[id].flag;
          const label = id === 'custom' ? t('presets.custom.name') : t(`presets.${id}.short`);
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => (id === 'custom' ? markCustom() : selectCountry(id))}
              className={clsx(
                'relative flex items-center justify-center gap-1.5 rounded-[0.6rem] px-1.5 py-2 text-sm font-semibold transition-colors',
                active ? 'text-text' : 'text-muted hover:text-text',
              )}
            >
              {active && (
                <motion.span
                  layoutId="country-pill"
                  className="absolute inset-0 rounded-[0.6rem] bg-surface-2 shadow-sm ring-1 ring-line"
                  transition={
                    prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }
                  }
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <span aria-hidden="true" className="text-base leading-none">
                  {flag}
                </span>
                <span className="truncate">{label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
