import { useTranslation } from 'react-i18next';
import { PRESETS } from '../data/presets';
import { useSimulation } from '../state/store';
import { formatRate } from '../lib/format';
import { RangeSlider } from './primitives/RangeSlider';
import { InfoDot } from './primitives/InfoDot';
import { PauseIcon, PlayIcon, ResetIcon } from './icons';

const rate = (v: number) => formatRate(v, 1);
const yearValue = (v: number) => String(Math.round(v));

/** The core Simple-view controls: the two rate sliders and the year scrubber. */
export function Controls() {
  const { t } = useTranslation();
  const { params, presetId, setParam, selectedYear, setYear, playing, togglePlay, pause, reset } =
    useSimulation();
  const preset = PRESETS[presetId];

  return (
    <div className="card space-y-5 p-5">
      <div data-tour="rates" className="space-y-5">
        <RangeSlider
          label={t('controls.assetReturn')}
          value={params.assetReturn}
          min={0}
          max={12}
          step={0.5}
          onChange={(v) => setParam('assetReturn', v)}
          formatValue={rate}
          help={`${t('controls.assetReturnHelp')} ${preset.assetReturn.note ?? ''}`}
          source={preset.assetReturn.source}
        />
        <RangeSlider
          label={t('controls.economyGrowth')}
          value={params.economyGrowth}
          min={0}
          max={6}
          step={0.5}
          onChange={(v) => setParam('economyGrowth', v)}
          formatValue={rate}
          help={`${t('controls.economyGrowthHelp')} ${preset.economyGrowth.note ?? ''}`}
          source={preset.economyGrowth.source}
        />
      </div>

      <div data-tour="year" className="border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <span className="text-sm font-medium text-muted">{t('controls.year')}</span>
            <InfoDot title={t('controls.year')} note={t('controls.yearHelp')} />
          </div>
          <span className="tnum text-sm font-semibold text-text">
            {t('controls.yearOf', { year: selectedYear, total: params.years })}
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
              max={params.years}
              step={1}
              onChange={setYear}
              onScrubStart={pause}
              showBubble
              formatValue={yearValue}
              ariaValueText={t('controls.yearOf', { year: selectedYear, total: params.years })}
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
    </div>
  );
}
