import { useTranslation } from 'react-i18next';
import { useSimulation } from '../state/store';
import { formatRate } from '../lib/format';
import { RangeSlider } from './primitives/RangeSlider';

const rate = (v: number) => formatRate(v, 1);

/** The two core rate sliders: asset return (r) and economy growth (g). */
export function Controls() {
  const { assetReturn, economyGrowth, preset, setReturn } = useSimulation();
  const { t } = useTranslation();

  return (
    <div className="card p-5">
      <div data-tour="rates" className="space-y-5">
        <RangeSlider
          label={t('controls.assetReturn')}
          value={assetReturn}
          min={0}
          max={12}
          step={0.5}
          onChange={(v) => setReturn('assetReturn', v)}
          formatValue={rate}
          help={`${t('controls.assetReturnHelp')} ${preset.assetReturn.note ?? ''}`}
          source={preset.assetReturn.source}
        />
        <RangeSlider
          label={t('controls.economyGrowth')}
          value={economyGrowth}
          min={0}
          max={6}
          step={0.5}
          onChange={(v) => setReturn('economyGrowth', v)}
          formatValue={rate}
          help={`${t('controls.economyGrowthHelp')} ${preset.economyGrowth.note ?? ''}`}
          source={preset.economyGrowth.source}
        />
      </div>
    </div>
  );
}
