import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useSimulation } from '../state/store';
import { CountUp } from './primitives/CountUp';
import { formatGini, formatMultiple, formatPercent, formatRatio } from '../lib/format';

const pct0 = (v: number) => formatPercent(v, 0);

/** The animated stat tiles plus the plain-language absolute-vs-relative readout. */
export function StatCards() {
  const { t } = useTranslation();
  const { stats, startStats, selectedYear, params } = useSimulation();

  const readout =
    selectedYear === 0
      ? t('readout.start', { top: params.topPercentile, share: pct0(stats.topShare) })
      : t('readout.main', {
          multiple: formatMultiple(stats.economyMultiple),
          top: params.topPercentile,
          share: pct0(stats.topShare),
        });

  return (
    <div className="space-y-3">
      <div className="card border-accent/30 bg-accent/[0.06] p-4">
        <p className="text-[15px] font-medium leading-snug text-text">{readout}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{t('readout.note')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          title={t('stats.topShare', { pct: params.topPercentile })}
          sub={t('stats.topShareFromTo', { start: pct0(startStats.topShare) })}
          accent
        >
          <CountUp value={stats.topShare} format={pct0} />
        </StatTile>

        <StatTile title={t('stats.economySize')} sub={t('stats.economySizeSub')}>
          <CountUp value={stats.economyMultiple} format={formatMultiple} />
        </StatTile>

        <StatTile title={t('stats.perCapita')} sub={t('stats.perCapitaSub')}>
          <CountUp value={stats.perCapitaRatio} format={formatRatio} />
        </StatTile>

        <StatTile title={t('stats.gini')} sub={t('stats.giniSub')}>
          <CountUp value={stats.gini} format={formatGini} />
        </StatTile>
      </div>
    </div>
  );
}

function StatTile({
  title,
  sub,
  accent = false,
  children,
}: {
  title: string;
  sub: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col justify-between gap-2 p-4">
      <p className="text-xs font-medium leading-tight text-muted">{title}</p>
      <div>
        <div
          className={clsx('tnum text-3xl font-bold leading-none', accent ? 'text-accent' : 'text-text')}
        >
          {children}
        </div>
        <p className="mt-1.5 text-xs leading-tight text-faint">{sub}</p>
      </div>
    </div>
  );
}
