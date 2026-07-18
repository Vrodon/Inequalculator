import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import { RangeSlider } from './primitives/RangeSlider';
import { InfoDot } from './primitives/InfoDot';
import { PauseIcon, PlayIcon, ResetIcon } from './icons';

const yearValue = (v: number) => String(Math.round(v));

/**
 * The time scrubber: play/pause, the year slider, and reset. It sits directly
 * beneath the pie so that on mobile you can press play — or drag the year — and
 * watch the donut respond in the same view, without scrolling back up.
 */
export function YearScrubber() {
  const { years, selectedYear, playing, setYear, togglePlay, pause, reset } = useSimulation();
  const { t } = useTranslation();

  return (
    <div data-tour="year" className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <span className="text-sm font-medium text-muted">{t('controls.year')}</span>
          <InfoDot title={t('controls.year')} note={t('controls.yearHelp')} />
        </div>
        <span className="tnum text-sm font-semibold text-text">
          {t('controls.yearOf', { year: selectedYear, total: years })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? t('controls.pauseAria') : t('controls.playAria')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-bg shadow-md transition hover:brightness-110 active:scale-95"
        >
          {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </button>
        <div className="min-w-0 flex-1 pt-4">
          <RangeSlider
            hideHeader
            label={t('controls.year')}
            value={selectedYear}
            min={0}
            max={years}
            step={1}
            onChange={setYear}
            onScrubStart={pause}
            showBubble
            formatValue={yearValue}
            ariaValueText={t('controls.yearOf', { year: selectedYear, total: years })}
          />
        </div>
        <button
          type="button"
          onClick={reset}
          aria-label={t('controls.resetAria')}
          title={t('controls.reset')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-muted transition hover:bg-surface-2 hover:text-text active:scale-95"
        >
          <ResetIcon size={18} />
        </button>
      </div>
    </div>
  );
}
