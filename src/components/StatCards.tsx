import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useSimulation } from '../state/store';
import { CountUp } from './primitives/CountUp';
import {
  formatCountCompact,
  formatCurrencyCompact,
  formatGini,
  formatMultiple,
  formatPercent,
} from '../lib/format';

const pct0 = (v: number) => formatPercent(v, 0);

/** Animated stat tiles plus the plain-language absolute-vs-relative readout. */
export function StatCards() {
  const { t } = useTranslation();
  const { stats, startStats, selectedYear, taxActive, taxSpec, householdsTaxed, currencySymbol } =
    useSimulation();
  const householdsTaxedSub =
    taxSpec.style === 'flatOnGroups' ? t('stats.householdsTaxedSubFlat') : t('stats.householdsTaxedSub');

  const fmtCurrency = (v: number) => formatCurrencyCompact(v, currencySymbol);

  const readout =
    selectedYear === 0
      ? t('readout.start', {
          top1: pct0(startStats.topGroupShare),
          top10: pct0(startStats.topTailShare),
        })
      : t('readout.main', {
          multiple: formatMultiple(stats.economyMultiple),
          top1: pct0(stats.topGroupShare),
          top10: pct0(stats.topTailShare),
        });

  return (
    <div className="space-y-3">
      <div className="card border-accent/30 bg-accent/[0.06] p-4">
        <p className="text-[15px] font-medium leading-snug text-text">{readout}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{t('readout.note')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile title={t('stats.top1Share')} sub={t('stats.top1ShareSub')} accent>
          <CountUp value={stats.topGroupShare} format={pct0} />
        </StatTile>
        <StatTile title={t('stats.top10Share')} sub={t('stats.top10ShareSub')}>
          <CountUp value={stats.topTailShare} format={pct0} />
        </StatTile>
        <StatTile title={t('stats.economySize')} sub={t('stats.economySizeSub')}>
          <CountUp value={stats.economyMultiple} format={formatMultiple} />
        </StatTile>
        <StatTile title={t('stats.gini')} sub={t('stats.giniSub')}>
          <CountUp value={stats.gini} format={formatGini} />
        </StatTile>

        {taxActive && (
          <>
            <StatTile title={t('stats.taxRevenue')} sub={t('stats.taxRevenueSub')} tone="cool">
              <CountUp value={stats.cumulativeTax} format={fmtCurrency} />
            </StatTile>
            <StatTile title={t('stats.householdsTaxed')} sub={householdsTaxedSub} tone="cool">
              <CountUp value={householdsTaxed} format={formatCountCompact} />
            </StatTile>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({
  title,
  sub,
  accent = false,
  tone,
  children,
}: {
  title: string;
  sub: string;
  accent?: boolean;
  tone?: 'cool';
  children: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col justify-between gap-2 p-4">
      <p className="text-xs font-medium leading-tight text-muted">{title}</p>
      <div>
        <div
          className={clsx(
            'tnum text-3xl font-bold leading-none',
            accent ? 'text-g1' : tone === 'cool' ? 'text-g3' : 'text-text',
          )}
        >
          {children}
        </div>
        <p className="mt-1.5 text-xs leading-tight text-faint">{sub}</p>
      </div>
    </div>
  );
}
